'use client';

import { Sparkles } from 'lucide-react';

interface ChatEmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

const SUGGESTIONS = [
  'Explain quantum computing basics',
  'Teach me about machine learning',
  'Create a guide on React hooks',
  'Help me understand blockchain',
];

export function ChatEmptyState({ onSuggestionClick }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold">What would you like to learn?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe a topic and I&apos;ll create personalized learning content for you.
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
