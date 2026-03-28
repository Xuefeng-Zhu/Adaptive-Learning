import { NextRequest, NextResponse } from 'next/server';
import { createServerInsforge } from '@/lib/insforge-server';
import {
  getMessages,
  addMessage,
  linkGeneratedContent,
} from '@/services/chat';
import { parseAIResponse } from '@/services/content';
import type { UserProfile } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const serverInsforge = createServerInsforge(request);

    const { data: authData } = await serverInsforge.auth.getCurrentUser();
    if (!authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authData.user.id;
    const profile = (authData.user.profile as unknown as UserProfile) || {};

    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    // Fetch conversation messages
    const messages = await getMessages(serverInsforge, conversationId);
    if (messages.length === 0) {
      return NextResponse.json({ error: 'No messages in conversation' }, { status: 400 });
    }

    // Format conversation for the AI prompt
    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.content}`)
      .join('\n\n');

    // Call AI to generate structured content
    const response = await serverInsforge.ai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Based on the following conversation between a learner and a tutor, generate a comprehensive structured educational document.

Learner profile:
- Education level: ${profile.education_level || 'not specified'}
- Profession: ${profile.profession || 'not specified'}
- Interests: ${profile.interests || 'not specified'}

Conversation:
---
${conversationText}
---

Generate a JSON object with this exact structure:
{
  "title": "the document title",
  "summary": "a 2-3 sentence summary",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty": 50,
  "sections": [
    { "heading": "Section Title", "body": "full section text", "wordCount": 123 }
  ]
}

Rules:
- Create 3-8 well-structured sections that teach the topic discussed
- Adapt the language to the learner's education level
- difficulty is 1-100 (match to learner's level)
- Tags should be 3-8 relevant topic keywords
- Each section should be 200-500 words
- Include examples, analogies, and explanations appropriate to the learner's background
- Return ONLY valid JSON, no markdown formatting`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || '';
    const parsed = parseAIResponse(text);

    // Insert content record
    const totalWords = parsed.sections.reduce((sum, s) => sum + s.wordCount, 0);
    const { data: contentRows, error: contentError } = await serverInsforge.database
      .from('content')
      .insert({
        title: parsed.title,
        source_type: 'chat_generated',
        original_text: parsed.sections.map((s) => s.body).join('\n\n'),
        summary: parsed.summary,
        tags: parsed.tags,
        difficulty: parsed.difficulty,
        word_count: totalWords,
        status: 'ready',
        uploader_id: userId,
        is_public: false,
      })
      .select();

    if (contentError || !contentRows?.[0]) {
      throw new Error(contentError?.message || 'Failed to create content');
    }

    const contentId = contentRows[0].id;

    // Insert content sections
    const sections = parsed.sections.map((s, i) => ({
      content_id: contentId,
      section_order: i,
      heading: s.heading,
      body: s.body,
      word_count: s.wordCount,
    }));

    if (sections.length > 0) {
      await serverInsforge.database.from('content_sections').insert(sections);
    }

    // Link content to conversation
    await linkGeneratedContent(serverInsforge, conversationId, contentId);

    // Add assistant message indicating content was generated
    await addMessage(serverInsforge, conversationId, 'assistant', `I've created a structured learning guide: **${parsed.title}**. You can open it in the reader to study with adaptive difficulty levels.`, {
      content_generated: true,
      content_id: contentId,
    });

    return NextResponse.json({
      contentId,
      title: parsed.title,
      sectionCount: parsed.sections.length,
    });
  } catch (err) {
    console.error('Content generation error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
