'use client';

import { useState, useCallback, useRef } from 'react';
import { insforge, getAccessToken } from '@/lib/insforge';
import type { Quiz, QuizAttempt } from '@/types';

export type QuizPhase = 'idle' | 'loading' | 'taking' | 'reviewing';

interface UseQuizReturn {
  quiz: Quiz | null;
  attempts: QuizAttempt[];
  phase: QuizPhase;
  currentIndex: number;
  selectedAnswers: Map<number, number>;
  isLoading: boolean;
  error: string | null;
  generateQuiz: (contentId: string) => Promise<void>;
  selectAnswer: (questionIndex: number, optionIndex: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitQuiz: () => Promise<void>;
  retake: () => void;
  reviewAnswers: () => void;
  score: number | null;
}

export function useQuiz(): UseQuizReturn {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [phase, setPhase] = useState<QuizPhase>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Map<number, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const timerRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  const generateQuiz = useCallback(async (contentId: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase('loading');
    setIsLoading(true);
    setError(null);
    setScore(null);
    setSelectedAnswers(new Map());
    setCurrentIndex(0);

    try {
      const token = getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ contentId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setQuiz(data.quiz);
      setAttempts(data.attempts || []);
      timerRef.current = Date.now();
      setPhase('taking');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message);
      setPhase('idle');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectAnswer = useCallback((questionIndex: number, optionIndex: number) => {
    setSelectedAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionIndex, optionIndex);
      return next;
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setCurrentIndex((prev) => (quiz ? Math.min(prev + 1, quiz.questions.length - 1) : prev));
  }, [quiz]);

  const prevQuestion = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const submitQuiz = useCallback(async () => {
    if (!quiz) return;

    const timeSpent = Math.round((Date.now() - timerRef.current) / 1000);
    let correct = 0;
    const answersArray: number[] = [];

    for (let i = 0; i < quiz.questions.length; i++) {
      const selected = selectedAnswers.get(i) ?? -1;
      answersArray.push(selected);
      if (selected === quiz.questions[i].correctIndex) correct++;
    }

    setScore(correct);
    setPhase('reviewing');

    // Save attempt to database
    try {
      const { data } = await insforge.database
        .from('quiz_attempts')
        .insert({
          quiz_id: quiz.id,
          user_id: quiz.user_id,
          answers: JSON.stringify(answersArray),
          score: correct,
          total: quiz.questions.length,
          time_spent_seconds: timeSpent,
        })
        .select()
        .single();

      if (data) {
        setAttempts((prev) => [
          { ...data, answers: answersArray } as QuizAttempt,
          ...prev,
        ]);
      }
    } catch {
      // Attempt save failed silently - score is still shown
    }
  }, [quiz, selectedAnswers]);

  const retake = useCallback(() => {
    setSelectedAnswers(new Map());
    setCurrentIndex(0);
    setScore(null);
    timerRef.current = Date.now();
    setPhase('taking');
  }, []);

  const reviewAnswers = useCallback(() => {
    setCurrentIndex(0);
    setPhase('reviewing');
  }, []);

  return {
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
    reviewAnswers,
    score,
  };
}
