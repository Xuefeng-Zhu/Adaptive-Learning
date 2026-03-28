'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Quiz, QuizAttempt } from '@/types';
import { Trophy, RotateCcw, Eye, X } from 'lucide-react';

interface QuizResultsProps {
  quiz: Quiz;
  score: number;
  attempts: QuizAttempt[];
  onRetake: () => void;
  onReview: () => void;
  onClose: () => void;
}

export function QuizResults({
  quiz,
  score,
  attempts,
  onRetake,
  onReview,
  onClose,
}: QuizResultsProps) {
  const total = quiz.questions.length;
  const percentage = Math.round((score / total) * 100);

  const colorClass =
    percentage >= 80
      ? 'text-green-500'
      : percentage >= 50
        ? 'text-yellow-500'
        : 'text-red-500';

  const bgClass =
    percentage >= 80
      ? 'bg-green-500/10'
      : percentage >= 50
        ? 'bg-yellow-500/10'
        : 'bg-red-500/10';

  const message =
    percentage >= 80
      ? 'Excellent work!'
      : percentage >= 50
        ? 'Good effort, keep learning!'
        : 'Keep studying, you can improve!';

  // Exclude the current attempt (already displayed as the main score)
  const pastAttempts = attempts.slice(1);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className={cn('mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full', bgClass)}>
          <Trophy className={cn('h-10 w-10', colorClass)} />
        </div>
        <p className="text-lg font-semibold">Quiz Complete!</p>
        <p className={cn('text-3xl font-bold', colorClass)}>
          {score} / {total}
        </p>
        <p className="text-sm text-muted-foreground">{percentage}% correct</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>

      {pastAttempts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Previous Attempts</p>
          <div className="space-y-1.5">
            {pastAttempts.slice(0, 5).map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">
                  {new Date(attempt.completed_at).toLocaleDateString()}
                </span>
                <Badge variant="secondary">
                  {attempt.score}/{attempt.total} ({Math.round((attempt.score / attempt.total) * 100)}%)
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onReview} variant="outline" className="flex-1">
          <Eye className="mr-1.5 h-4 w-4" />
          Review Answers
        </Button>
        <Button onClick={onRetake} variant="outline" className="flex-1">
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Retake Quiz
        </Button>
        <Button onClick={onClose} variant="default" className="flex-1">
          <X className="mr-1.5 h-4 w-4" />
          Close
        </Button>
      </div>
    </div>
  );
}
