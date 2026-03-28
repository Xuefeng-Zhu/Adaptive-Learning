'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdaptationStream } from '@/hooks/use-adaptation-stream';
import type { ContentSection } from '@/types';
import ReactMarkdown from 'react-markdown';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';

interface SectionRendererProps {
  section: ContentSection;
  contentId: string;
  adaptationLevel: number;
  onVisible: () => void;
}

export function SectionRenderer({
  section,
  contentId,
  adaptationLevel,
  onVisible,
}: SectionRendererProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const { text, isStreaming, error, startStream } = useAdaptationStream();

  // IntersectionObserver to trigger adaptation when visible
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasBeenVisible) {
          setHasBeenVisible(true);
          onVisible();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasBeenVisible, onVisible]);

  // Trigger adaptation when visible or level changes
  useEffect(() => {
    if (hasBeenVisible) {
      startStream(contentId, section.id, adaptationLevel);
    }
  }, [hasBeenVisible, adaptationLevel, contentId, section.id, startStream]);

  return (
    <div ref={ref} className="group">
      {section.heading && (
        <h2 className="mb-4 text-xl font-semibold">{section.heading}</h2>
      )}

      {!hasBeenVisible ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">Failed to adapt: {error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => startStream(contentId, section.id, adaptationLevel)}
          >
            <RefreshCw className="mr-1 h-3 w-3" /> Retry
          </Button>
        </div>
      ) : (
        <div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {text ? (
              <ReactMarkdown>{text}</ReactMarkdown>
            ) : isStreaming ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : null}
          </div>
          {isStreaming && (
            <span className="mt-2 inline-block h-4 w-1 animate-pulse bg-primary" />
          )}
        </div>
      )}

      {/* Toggle original text */}
      {text && !isStreaming && (
        <div className="mt-3 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowOriginal(!showOriginal)}
          >
            {showOriginal ? (
              <><EyeOff className="mr-1 h-3 w-3" /> Hide original</>
            ) : (
              <><Eye className="mr-1 h-3 w-3" /> Show original</>
            )}
          </Button>
          {showOriginal && (
            <div className="mt-2 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              {section.body}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
