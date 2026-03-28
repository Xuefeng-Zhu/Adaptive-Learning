import { insforge } from '@/lib/insforge';

export interface ParsedSection {
  heading: string | null;
  body: string;
  wordCount: number;
}

export interface ParsedContent {
  title: string;
  summary: string;
  tags: string[];
  difficulty: number;
  sections: ParsedSection[];
}

async function extractPdfText(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/extract-pdf', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'PDF extraction failed' }));
    throw new Error(err.error || 'PDF extraction failed');
  }

  const { text } = await res.json();
  return text;
}

export async function uploadAndProcessFile(
  file: File,
  userId: string
): Promise<string> {
  // 1. Upload file to InsForge storage
  const { data: uploadData, error: uploadError } = await insforge.storage
    .from('documents')
    .uploadAuto(file);

  if (uploadError || !uploadData) {
    throw new Error(uploadError?.message || 'Upload failed');
  }

  // 2. Create content record (processing)
  const { data: contentRows, error: contentError } = await insforge.database
    .from('content')
    .insert({
      title: file.name.replace(/\.[^.]+$/, ''),
      source_type: file.type === 'application/pdf' ? 'upload_pdf' : 'upload_text',
      original_text: '',
      uploader_id: userId,
      file_url: uploadData.url,
      file_key: uploadData.key,
      status: 'processing',
      word_count: 0,
    })
    .select();

  if (contentError || !contentRows?.[0]) {
    throw new Error(contentError?.message || 'Failed to create content record');
  }

  const contentId = contentRows[0].id;

  // 3. Extract text and use AI to parse and analyze the document
  try {
    let text: string;

    if (file.type === 'application/pdf') {
      text = await extractPdfText(file);
    } else {
      text = await file.text();
    }

    const parsed = await parseTextWithAI(text);

    // 4. Create content sections
    const sections = parsed.sections.map((s, i) => ({
      content_id: contentId,
      section_order: i,
      heading: s.heading,
      body: s.body,
      word_count: s.wordCount,
    }));

    if (sections.length > 0) {
      await insforge.database.from('content_sections').insert(sections);
    }

    // 5. Update content record with parsed data
    const totalWords = parsed.sections.reduce((sum, s) => sum + s.wordCount, 0);
    await insforge.database
      .from('content')
      .update({
        title: parsed.title,
        original_text: parsed.sections.map((s) => s.body).join('\n\n'),
        summary: parsed.summary,
        tags: parsed.tags,
        difficulty: parsed.difficulty,
        word_count: totalWords,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', contentId);

    return contentId;
  } catch (err) {
    // Mark as failed
    await insforge.database
      .from('content')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', contentId);
    throw err;
  }
}

async function parseTextWithAI(text: string): Promise<ParsedContent> {
  const truncated = text.slice(0, 30000);
  const response = await insforge.ai.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Analyze this text and return a JSON object with this exact structure:
{
  "title": "the document title",
  "summary": "a 2-3 sentence summary",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty": 50,
  "sections": [
    { "heading": "Section Title or null", "body": "full section text", "wordCount": 123 }
  ]
}

Rules:
- Split into logical sections (by headings, or ~500 word chunks if no headings)
- Tags should be 3-8 relevant topic keywords
- Difficulty is 1-100 (1=very easy, 100=extremely advanced)
- Preserve all original content in the section bodies
- Return ONLY valid JSON, no markdown formatting

Text:
---
${truncated}
---`,
      },
    ],
  });

  const responseText = response.choices[0]?.message?.content || '';
  return parseAIResponse(responseText);
}

export function parseAIResponse(text: string): ParsedContent {
  // Try to extract JSON from the response
  let jsonStr = text.trim();

  // Remove markdown code fences if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      title: parsed.title || 'Untitled',
      summary: parsed.summary || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      difficulty: typeof parsed.difficulty === 'number' ? parsed.difficulty : 50,
      sections: Array.isArray(parsed.sections)
        ? parsed.sections.map((s: { heading?: string; body?: string; wordCount?: number }) => ({
            heading: s.heading || null,
            body: s.body || '',
            wordCount: s.wordCount || (s.body ? s.body.split(/\s+/).length : 0),
          }))
        : [{ heading: null, body: text, wordCount: text.split(/\s+/).length }],
    };
  } catch {
    // Fallback: treat entire text as one section
    return {
      title: 'Untitled Document',
      summary: text.slice(0, 200),
      tags: [],
      difficulty: 50,
      sections: [{ heading: null, body: text, wordCount: text.split(/\s+/).length }],
    };
  }
}

export async function processUrlImport(url: string, userId: string): Promise<string> {
  // Create content record first
  const { data: contentRows, error: contentError } = await insforge.database
    .from('content')
    .insert({
      title: url,
      source_type: 'url_import',
      source_url: url,
      original_text: '',
      uploader_id: userId,
      status: 'processing',
      word_count: 0,
    })
    .select();

  if (contentError || !contentRows?.[0]) {
    throw new Error(contentError?.message || 'Failed to create content record');
  }

  const contentId = contentRows[0].id;

  try {
    // Use AI with web search to fetch and analyze the URL
    const response = await insforge.ai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Fetch and analyze the content from this URL: ${url}

Return a JSON object with this exact structure:
{
  "title": "the page title",
  "summary": "a 2-3 sentence summary",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty": 50,
  "sections": [
    { "heading": "Section Title or null", "body": "full section text", "wordCount": 123 }
  ]
}

Rules:
- Extract the main article/content text, skip navigation and ads
- Split into logical sections
- Tags should be 3-8 relevant topic keywords
- Difficulty is 1-100
- Return ONLY valid JSON, no markdown formatting`,
        },
      ],
      webSearch: { enabled: true, maxResults: 1 },
    });

    const text = response.choices[0]?.message?.content || '';
    const parsed = parseAIResponse(text);

    // Create sections
    const sections = parsed.sections.map((s, i) => ({
      content_id: contentId,
      section_order: i,
      heading: s.heading,
      body: s.body,
      word_count: s.wordCount,
    }));

    if (sections.length > 0) {
      await insforge.database.from('content_sections').insert(sections);
    }

    // Update content
    const totalWords = parsed.sections.reduce((sum, s) => sum + s.wordCount, 0);
    await insforge.database
      .from('content')
      .update({
        title: parsed.title,
        original_text: parsed.sections.map((s) => s.body).join('\n\n'),
        summary: parsed.summary,
        tags: parsed.tags,
        difficulty: parsed.difficulty,
        word_count: totalWords,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', contentId);

    return contentId;
  } catch (err) {
    await insforge.database
      .from('content')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', contentId);
    throw err;
  }
}
