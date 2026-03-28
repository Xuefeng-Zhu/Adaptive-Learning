'use client';

import { useState, useCallback, useRef } from 'react';
import { getAccessToken } from '@/lib/insforge';

interface UseChatStreamReturn {
  streamingText: string;
  isStreaming: boolean;
  error: string | null;
  conversationId: string | null;
  startStream: (conversationId: string | null, message: string) => Promise<void>;
  cancel: () => void;
}

export function useChatStream(): UseChatStreamReturn {
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (existingConversationId: string | null, message: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStreamingText('');
      setError(null);
      setIsStreaming(true);

      try {
        const token = getAccessToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            conversationId: existingConversationId,
            message,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let accumulated = '';
        let headerParsed = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          accumulated += decoder.decode(value, { stream: true });

          if (!headerParsed) {
            const newlineIdx = accumulated.indexOf('\n');
            if (newlineIdx !== -1) {
              // Parse the JSON header line
              const headerLine = accumulated.slice(0, newlineIdx);
              try {
                const header = JSON.parse(headerLine);
                if (header.conversationId) {
                  setConversationId(header.conversationId);
                }
              } catch {
                // If header parsing fails, treat everything as content
              }
              headerParsed = true;
              // The rest after the newline is content
              const content = accumulated.slice(newlineIdx + 1);
              setStreamingText(content);
            }
          } else {
            setStreamingText(accumulated.slice(accumulated.indexOf('\n') + 1));
          }
        }

        setIsStreaming(false);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError((err as Error).message);
        setIsStreaming(false);
      }
    },
    []
  );

  return { streamingText, isStreaming, error, conversationId, startStream, cancel };
}
