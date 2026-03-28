'use client';

import { useState, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Square, Sparkles } from 'lucide-react';

interface ChatInputBarProps {
  onSend: (message: string) => void;
  onGenerateContent: () => void;
  isStreaming: boolean;
  onCancel: () => void;
  showGenerateButton: boolean;
  isGenerating: boolean;
}

export function ChatInputBar({
  onSend,
  onGenerateContent,
  isStreaming,
  onCancel,
  showGenerateButton,
  isGenerating,
}: ChatInputBarProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || isGenerating) return;
    onSend(trimmed);
    setValue('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isStreaming, isGenerating, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-card p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to learn..."
          className="min-h-[48px] max-h-[200px] resize-none"
          disabled={isStreaming || isGenerating}
        />
        <div className="flex flex-col gap-1">
          {isStreaming ? (
            <Button
              size="icon"
              variant="outline"
              onClick={onCancel}
              title="Stop"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!value.trim() || isGenerating}
              title="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
          {showGenerateButton && !isStreaming && (
            <Button
              size="icon"
              variant="outline"
              onClick={onGenerateContent}
              disabled={isGenerating || isStreaming}
              title="Generate learning content"
              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
