import { NextRequest, NextResponse } from 'next/server';
import { createServerInsforge } from '@/lib/insforge-server';
import {
  createConversation,
  addMessage,
  getMessages,
  updateConversationTitle,
  buildChatSystemPrompt,
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
    const { conversationId: existingConversationId, message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Create or use existing conversation
    let conversationId = existingConversationId;
    const isNewConversation = !conversationId;

    if (!conversationId) {
      conversationId = await createConversation(serverInsforge, userId);
    }

    // Insert user message
    await addMessage(serverInsforge, conversationId, 'user', message);

    // Fetch conversation history
    const messages = await getMessages(serverInsforge, conversationId);

    // Build the messages array for AI
    const systemPrompt = buildChatSystemPrompt(profile);
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
              const title = message.length > 50
                ? message.slice(0, 47) + '...'
                : message;
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
