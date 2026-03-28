import { NextRequest, NextResponse } from 'next/server';
import { createServerInsforge } from '@/lib/insforge-server';
import {
  createConversation,
  findContentConversation,
  addMessage,
  getMessages,
  updateConversationTitle,
  buildChatSystemPrompt,
  buildContentChatSystemPrompt,
} from '@/services/chat';
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
    const { conversationId: existingConversationId, message, contentId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Create or use existing conversation
    let conversationId = existingConversationId;
    let isNewConversation = !conversationId;

    if (!conversationId && contentId) {
      // Look for existing conversation tied to this content
      conversationId = await findContentConversation(serverInsforge, userId, contentId);
      if (conversationId) {
        isNewConversation = false;
      }
    }

    if (!conversationId) {
      conversationId = await createConversation(serverInsforge, userId, contentId || undefined);
      isNewConversation = true;
    }

    // Insert user message
    await addMessage(serverInsforge, conversationId, 'user', message);

    // Fetch conversation history
    const messages = await getMessages(serverInsforge, conversationId);

    // Build the messages array for AI
    let systemPrompt: string;

    if (contentId) {
      // Fetch content and sections for context-aware prompt
      const [contentRes, sectionsRes] = await Promise.all([
        serverInsforge.database
          .from('content')
          .select('title, summary')
          .eq('id', contentId)
          .single(),
        serverInsforge.database
          .from('content_sections')
          .select('heading, body')
          .eq('content_id', contentId)
          .order('section_order', { ascending: true }),
      ]);

      const contentData = contentRes.data;
      const sectionTexts = (sectionsRes.data || []).map(
        (s: { heading: string | null; body: string }) =>
          s.heading ? `## ${s.heading}\n${s.body}` : s.body
      );

      systemPrompt = buildContentChatSystemPrompt(
        profile,
        contentData?.title || 'Untitled',
        contentData?.summary || null,
        sectionTexts
      );
    } else {
      systemPrompt = buildChatSystemPrompt(profile);
    }

    const aiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Stream from AI
    const modelId = 'openai/gpt-4o-mini';
    const stream = await serverInsforge.ai.chat.completions.create({
      model: modelId,
      messages: aiMessages,
      stream: true,
    });

    let fullText = '';
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation ID as the first line (JSON header)
          controller.enqueue(
            encoder.encode(JSON.stringify({ conversationId }) + '\n')
          );

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullText += content;
              controller.enqueue(encoder.encode(content));
            }
          }

          // Save the assistant message
          try {
            await addMessage(serverInsforge, conversationId, 'assistant', fullText);

            // Auto-set title on first exchange
            if (isNewConversation) {
              let title: string;
              if (contentId) {
                // Use content title for reading chat conversations
                const { data: c } = await serverInsforge.database
                  .from('content')
                  .select('title')
                  .eq('id', contentId)
                  .single();
                title = c?.title ? `Questions about: ${c.title}`.slice(0, 100) : message.slice(0, 50);
              } else {
                title = message.length > 50
                  ? message.slice(0, 47) + '...'
                  : message;
              }
              await updateConversationTitle(serverInsforge, conversationId, title);
            }
          } catch {
            // Non-critical: message save failure
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
        'X-Conversation-Id': conversationId,
      },
    });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
