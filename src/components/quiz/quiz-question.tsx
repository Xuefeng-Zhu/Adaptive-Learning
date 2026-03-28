'use client';

import { cn } from '@/lib/utils';
import type { QuizQuestion as QuizQuestionType } from '@/types';
import { CheckCircle2, XCircle } from 'lucide-react';

interface QuizQuestionProps {
  question: QuizQuestionType;
  questionIndex: number;
  selectedOption: number | undefined;
  onSelect: (optionIndex: number) => void;
  showAnswer: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function QuizQuestion({
  question,
  questionIndex,
  selectedOption,
  onSelect,
  showAnswer,
}: QuizQuestionProps) {
  return (
    <div className="space-y-4">
      <p className="text-base font-medium leading-relaxed">
        {questionIndex + 1}. {question.question}
      </p>

      <div className="space-y-2">
        {question.options.map((option, i) => {
          const isSelected = selectedOption === i;
          const isCorrect = i === question.correctIndex;

          let optionStyle = 'border-border hover:border-foreground/30 hover:bg-muted/50';
          if (showAnswer) {
            if (isCorrect) {
              optionStyle = 'border-green-500 bg-green-500/10';
            } else if (isSelected && !isCorrect) {
              optionStyle = 'border-red-500 bg-red-500/10';
            } else {
              optionStyle = 'border-border opacity-60';
            }
          } else if (isSelected) {
            optionStyle = 'border-primary bg-primary/5 ring-1 ring-primary';
          }

          return (
            <button
              key={i}
              type="button"
              disabled={showAnswer}
              onClick={() => onSelect(i)}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                optionStyle,
                !showAnswer && 'cursor-pointer'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                  showAnswer && isCorrect && 'border-green-500 bg-green-500 text-white',
                  showAnswer && isSelected && !isCorrect && 'border-red-500 bg-red-500 text-white',
                  !showAnswer && isSelected && 'border-primary bg-primary text-primary-foreground',
                  !showAnswer && !isSelected && 'border-muted-foreground/40'
                )}
              >
                {OPTION_LABELS[i]}
              </span>
              <span className="flex-1 pt-0.5">{option}</span>
              {showAnswer && isCorrect && (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              )}
              {showAnswer && isSelected && !isCorrect && (
                <XCircle className="h-5 w-5 shrink-0 text-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {showAnswer && question.explanation && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
          <span className="font-medium">Explanation:</span> {question.explanation}
        </div>
      )}
    </div>
  );
}
