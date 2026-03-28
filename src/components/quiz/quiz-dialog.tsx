'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QuizQuestion } from '@/components/quiz/quiz-question';
import { QuizResults } from '@/components/quiz/quiz-results';
import { useQuiz } from '@/hooks/use-quiz';
import { Loader2, ChevronLeft, ChevronRight, Send, AlertCircle } from 'lucide-react';

interface QuizDialogProps {
  contentId: string;
  contentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuizDialog({ contentId, contentTitle, open, onOpenChange }: QuizDialogProps) {
  const {
    quiz,
    attempts,
    phase,
    currentIndex,
    selectedAnswers,
    isLoading,
    error,
    generateQuiz,
    selectAnswer,
    nextQuestion,
    prevQuestion,
    submitQuiz,
    retake,
    score,
  } = useQuiz();

  const [showingResults, setShowingResults] = useState(false);

  useEffect(() => {
    if (open && phase === 'idle') {
      generateQuiz(contentId);
    }
  }, [open, phase, contentId, generateQuiz]);

  // Show results screen when quiz is first submitted
  useEffect(() => {
    if (phase === 'reviewing' && score !== null) {
      setShowingResults(true);
    }
  }, [phase, score]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleRetake = () => {
    setShowingResults(false);
    retake();
  };

  const handleReviewAnswers = () => {
    setShowingResults(false);
  };

  const total = quiz?.questions.length ?? 0;
  const isLastQuestion = currentIndex === total - 1;
  const allAnswered = quiz ? quiz.questions.every((_, i) => selectedAnswers.has(i)) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {phase === 'loading' && 'Generating Quiz...'}
            {phase === 'taking' && `Question ${currentIndex + 1} of ${total}`}
            {phase === 'reviewing' && showingResults && 'Quiz Results'}
            {phase === 'reviewing' && !showingResults && `Review: Question ${currentIndex + 1} of ${total}`}
          </DialogTitle>
          <DialogDescription>
            {phase === 'loading' && `Creating questions from "${contentTitle}"`}
            {phase === 'taking' && 'Select the best answer for each question'}
            {phase === 'reviewing' && showingResults && 'See how you did'}
            {phase === 'reviewing' && !showingResults && 'Reviewing your answers'}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Analyzing content and generating questions...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && phase === 'idle' && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => generateQuiz(contentId)}>
              Try Again
            </Button>
          </div>
        )}

        {/* Taking phase - one question at a time */}
        {phase === 'taking' && quiz && (
          <div className="space-y-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
              />
            </div>

            <QuizQuestion
              question={quiz.questions[currentIndex]}
              questionIndex={currentIndex}
              selectedOption={selectedAnswers.get(currentIndex)}
              onSelect={(optionIndex) => selectAnswer(currentIndex, optionIndex)}
              showAnswer={false}
            />

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevQuestion}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>

              {isLastQuestion ? (
                <Button size="sm" onClick={submitQuiz} disabled={!allAnswered || isLoading}>
                  <Send className="mr-1 h-4 w-4" />
                  Submit
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={nextQuestion}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {selectedAnswers.size} of {total} answered
            </p>
          </div>
        )}

        {/* Reviewing phase - results summary */}
        {phase === 'reviewing' && quiz && score !== null && showingResults && (
          <QuizResults
            quiz={quiz}
            score={score}
            attempts={attempts}
            onRetake={handleRetake}
            onReview={handleReviewAnswers}
            onClose={handleClose}
          />
        )}

        {/* Reviewing phase - individual question review */}
        {phase === 'reviewing' && quiz && score !== null && !showingResults && (
          <div className="space-y-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
              />
            </div>

            <QuizQuestion
              question={quiz.questions[currentIndex]}
              questionIndex={currentIndex}
              selectedOption={selectedAnswers.get(currentIndex)}
              onSelect={() => {}}
              showAnswer={true}
            />

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevQuestion}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              {isLastQuestion ? (
                <Button size="sm" onClick={handleClose}>
                  Done
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={nextQuestion}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
