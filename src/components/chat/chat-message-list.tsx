'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types';
import { ChatMessageBubble } from './chat-message-bubble';
import { ChatEmptyState } from './chat-empty-state';

interface ChatMessageListProps {
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
  onSuggestionClick: (text: string) => void;
}

export function ChatMessageList({
  messages,
  streamingText,
  isStreaming,
  onSuggestionClick,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  if (messages.length === 0 && !isStreaming) {
    return <ChatEmptyState onSuggestionClick={onSuggestionClick} />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}

        {/* Streaming message */}
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
  );
}
