'use client';

import { MessageCircle } from 'lucide-react';

interface ReadingChatEmptyStateProps {
  contentTitle: string;
  onSuggestionClick: (text: string) => void;
}

const SUGGESTIONS = [
  'Summarize the key points',
  'Explain the main concepts simply',
  'What are the practical applications?',
  'What should I learn next?',
];

export function ReadingChatEmptyState({
  contentTitle,
  onSuggestionClick,
}: ReadingChatEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
        <MessageCircle className="h-6 w-6 text-primary" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold">Ask about this article</h3>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
          Get help understanding &ldquo;{contentTitle}&rdquo;
        </p>
      </div>
      <div className="flex w-full flex-col gap-1.5">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-lg border bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
