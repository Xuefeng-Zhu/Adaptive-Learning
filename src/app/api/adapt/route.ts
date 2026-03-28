import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import {
  buildAdaptationPrompt,
  getAdaptationLevel,
  getCachedAdaptation,
  cacheAdaptation,
} from '@/services/adaptation';

export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const { data: authData } = await insforge.auth.getCurrentUser();
    if (!authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;
    const profile = authData.user.profile;

    const body = await request.json();
    const { contentId, sectionId, adaptationLevel: levelOverride } = body;

    if (!contentId || !sectionId) {
      return NextResponse.json({ error: 'Missing contentId or sectionId' }, { status: 400 });
    }

    // Fetch the section
    const { data: section } = await insforge.database
      .from('content_sections')
      .select('*')
      .eq('id', sectionId)
      .single();

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Fetch content for topic info
    const { data: content } = await insforge.database
      .from('content')
      .select('topic_id')
      .eq('id', contentId)
      .single();

    // Determine adaptation level
    const adaptationLevel = await getAdaptationLevel(
      userId,
      content?.topic_id || null,
      profile?.education_level || null,
      levelOverride
    );

    // Check cache
    const cached = await getCachedAdaptation(contentId, sectionId, userId, adaptationLevel);
    if (cached) {
      // Return cached as a simple response
      return NextResponse.json({ text: cached, cached: true, adaptationLevel });
    }

    // Build prompt and stream from AI
    const { system, user } = buildAdaptationPrompt(
      section.body,
      adaptationLevel,
      profile?.education_level || null,
      profile?.profession || null
    );

    const modelId = 'openai/gpt-4o-mini';

    const stream = await insforge.ai.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: true,
    });

    // Create a ReadableStream from the AI stream
    let fullText = '';
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullText += content;
              controller.enqueue(encoder.encode(content));
            }
          }

          // Cache the complete adaptation
          try {
            await cacheAdaptation(
              contentId,
              sectionId,
              userId,
              adaptationLevel,
              fullText,
              modelId
            );
          } catch {
            // Cache write failure is non-critical
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Adaptation-Level': String(adaptationLevel),
      },
    });
  } catch (err) {
    console.error('Adaptation error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
