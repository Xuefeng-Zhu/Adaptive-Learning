'use client';

import { useState, useCallback, useRef } from 'react';

interface UseAdaptationStreamReturn {
  text: string;
  isStreaming: boolean;
  error: string | null;
  adaptationLevel: number | null;
  startStream: (contentId: string, sectionId: string, level?: number) => Promise<void>;
  cancel: () => void;
}

export function useAdaptationStream(): UseAdaptationStreamReturn {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adaptationLevel, setAdaptationLevel] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (contentId: string, sectionId: string, level?: number) => {
      // Cancel any existing stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setText('');
      setError(null);
      setIsStreaming(true);

      try {
        const response = await fetch('/api/adapt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId,
            sectionId,
            adaptationLevel: level,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const levelHeader = response.headers.get('X-Adaptation-Level');
        if (levelHeader) setAdaptationLevel(Number(levelHeader));

        // Check if it's a JSON cached response
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          setText(data.text);
          if (data.adaptationLevel) setAdaptationLevel(data.adaptationLevel);
          setIsStreaming(false);
          return;
        }

        // Stream response
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setText(accumulated);
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

  return { text, isStreaming, error, adaptationLevel, startStream, cancel };
}
