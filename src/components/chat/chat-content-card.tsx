'use client';

import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ChatContentCardProps {
  contentId: string;
  title: string;
}

export function ChatContentCard({ contentId, title }: ChatContentCardProps) {
  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardContent className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
          <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Content Generated
          </p>
          <p className="truncate text-sm font-medium">{title}</p>
        </div>
        <Button variant="ghost" size="sm" render={<Link href={`/read/${contentId}`} />}>
          Open <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
