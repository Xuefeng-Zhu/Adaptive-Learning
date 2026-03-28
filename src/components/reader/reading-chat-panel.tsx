'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { insforge } from '@/lib/insforge';
import { useChatStream } from '@/hooks/use-chat-stream';
import { ChatMessageBubble } from '@/components/chat/chat-message-bubble';
import { ChatInputBar } from '@/components/chat/chat-input-bar';
import { ReadingChatEmptyState } from './reading-chat-empty-state';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMessage } from '@/types';

interface ReadingChatPanelProps {
  contentId: string;
  contentTitle: string;
  userId: string;
  onClose: () => void;
}

export function ReadingChatPanel({
  contentId,
  contentTitle,
  userId,
  onClose,
}: ReadingChatPanelProps) {
  const {
    streamingText,
    isStreaming,
    error: streamError,
    conversationId: streamConversationId,
    startStream,
    cancel,
  } = useChatStream();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load existing conversation for this content
  useEffect(() => {
    async function loadExisting() {
      try {
        const { data } = await insforge.database
          .from('chat_conversations')
          .select('id')
          .eq('user_id', userId)
          .eq('context_content_id', contentId)
          .eq('status', 'active')
          .maybeSingle();

        if (data?.id) {
          setConversationId(data.id);
          const { data: msgs } = await insforge.database
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', data.id)
            .order('created_at', { ascending: true });
          setMessages((msgs || []) as ChatMessage[]);
        }
      } catch {
        // Silently fail - will start fresh
      } finally {
        setIsLoadingMessages(false);
      }
    }
    loadExisting();
  }, [userId, contentId]);

  // Update conversation ID when created via streaming
  useEffect(() => {
    if (streamConversationId && !conversationId) {
      setConversationId(streamConversationId);
    }
  }, [streamConversationId, conversationId]);

  // Show stream errors
  useEffect(() => {
    if (streamError) {
      toast.error('Failed to get response: ' + streamError);
    }
  }, [streamError]);

  // When streaming finishes, reload messages
  useEffect(() => {
    if (!isStreaming && streamingText && (conversationId || streamConversationId)) {
      const convId = conversationId || streamConversationId;
      if (convId) {
        loadMessages(convId);
      }
    }
  }, [isStreaming]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  async function loadMessages(convId: string) {
    try {
      const { data } = await insforge.database
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
      setMessages((data || []) as ChatMessage[]);
    } catch {
      // Silently fail
    }
  }

  const handleSend = useCallback(
    async (message: string) => {
      const optimisticMessage: ChatMessage = {
        id: 'temp-' + Date.now(),
        conversation_id: conversationId || '',
        role: 'user',
        content: message,
        metadata: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      await startStream(conversationId, message, { contentId });
    },
    [conversationId, contentId, startStream]
  );

  return (
    <div className="fixed bottom-24 right-6 z-20 flex w-96 flex-col rounded-2xl border bg-card shadow-xl max-sm:inset-3 max-sm:bottom-3 max-sm:w-auto" style={{ height: '32rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">Article Chat</h3>
          <p className="truncate text-xs text-muted-foreground">{contentTitle}</p>
        </div>
        <Button variant="ghost" size="icon" className="ml-2 h-8 w-8 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      {isLoadingMessages ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : messages.length === 0 && !isStreaming ? (
        <ReadingChatEmptyState
          contentTitle={contentTitle}
          onSuggestionClick={handleSend}
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-3">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}

            {isStreaming && streamingText && (
              <ChatMessageBubble
                message={{
                  id: 'streaming',
                  conversation_id: '',
                  role: 'assistant',
                  content: streamingText,
                  metadata: null,
                  created_at: new Date().toISOString(),
                }}
                isStreaming
              />
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInputBar
        onSend={handleSend}
        onGenerateContent={() => {}}
        isStreaming={isStreaming}
        onCancel={cancel}
        showGenerateButton={false}
        isGenerating={false}
      />
    </div>
  );
}
