'use client';

import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';
import { ChatContentCard } from './chat-content-card';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function ChatMessageBubble({ message, isStreaming }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';

  // If this message has content_generated metadata, render a content card
  if (message.metadata?.content_generated && message.metadata.content_id) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] space-y-2">
          <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
          <ChatContentCard
            contentId={message.metadata.content_id}
            title={message.content}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'rounded-tr-sm bg-primary text-primary-foreground'
            : 'rounded-tl-sm bg-muted'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {isStreaming && (
          <span className="mt-1 inline-block h-4 w-1 animate-pulse bg-primary" />
        )}
      </div>
    </div>
  );
}
