import type { InsForgeClient } from '@insforge/sdk';
import type { QuizQuestion, Quiz, QuizAttempt } from '@/types';

export function buildQuizPrompt(
  sections: Array<{ heading: string | null; body: string; section_order: number }>,
  contentTitle: string,
  questionCount: number = 5
): { system: string; user: string } {
  const condensed = sections
    .map((s) => {
      const heading = s.heading ? `## ${s.heading}\n` : '';
      const preview = s.body.slice(0, 500);
      return `[Section ${s.section_order}]\n${heading}${preview}`;
    })
    .join('\n\n')
    .slice(0, 15000);

  const system = `You are an expert educational assessment designer. Generate multiple-choice quiz questions that test comprehension of provided content. Always return valid JSON only, with no additional text.`;

  const user = `Create a quiz with exactly ${questionCount} multiple-choice questions based on the following document titled "${contentTitle}".

Return ONLY a JSON object matching this schema:
{
  "questions": [
    {
      "question": "Clear question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this answer is correct",
      "sectionOrder": 0
    }
  ]
}

Rules:
- Each question must have exactly 4 options with only 1 correct answer
- correctIndex is 0-3 (index of the correct option)
- sectionOrder references the section number the question is derived from
- Spread questions across different sections when possible
- Test comprehension and understanding, not trivial memorization
- Make all distractors plausible but clearly incorrect
- Vary difficulty: include factual recall, conceptual, and application questions
- Write clear, unambiguous question text
- Return ONLY valid JSON, no markdown fences or extra text

Document:
---
${condensed}
---`;

  return { system, user };
}

export function parseQuizResponse(
  text: string,
  sections: Array<{ id: string; section_order: number }>
): QuizQuestion[] {
  let jsonStr = text.trim();

  // Remove markdown code fences if present
  const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();

  try {
    const parsed = JSON.parse(jsonStr);
    const rawQuestions = parsed.questions || [];

    const sectionMap = new Map(sections.map((s) => [s.section_order, s.id]));

    return rawQuestions.map(
      (q: {
        question?: string;
        options?: string[];
        correctIndex?: number;
        explanation?: string;
        sectionOrder?: number;
      }) => {
        const options = Array.isArray(q.options) ? q.options : [];
        while (options.length < 4) options.push(`Option ${options.length + 1}`);

        return {
          question: q.question || 'Question',
          options: [options[0], options[1], options[2], options[3]] as [
            string,
            string,
            string,
            string,
          ],
          correctIndex: Math.max(0, Math.min(3, q.correctIndex ?? 0)),
          explanation: q.explanation || '',
          sectionId: sectionMap.get(q.sectionOrder ?? 0) ?? null,
        };
      }
    );
  } catch {
    return [];
  }
}

export async function getCachedQuiz(
  client: InsForgeClient,
  contentId: string,
  userId: string
): Promise<Quiz | null> {
  const { data } = await client.database
    .from('quizzes')
    .select('*')
    .eq('content_id', contentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    questions:
      typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions,
  } as Quiz;
}

export async function saveQuiz(
  client: InsForgeClient,
  contentId: string,
  userId: string,
  questions: QuizQuestion[],
  modelUsed: string | null
): Promise<Quiz | null> {
  const { data, error } = await client.database
    .from('quizzes')
    .insert({
      content_id: contentId,
      user_id: userId,
      questions: JSON.stringify(questions),
      question_count: questions.length,
      model_used: modelUsed,
    })
    .select()
    .single();

  if (error || !data) return null;

  return {
    ...data,
    questions,
  } as Quiz;
}

export async function getQuizAttempts(
  client: InsForgeClient,
  quizId: string,
  userId: string
): Promise<QuizAttempt[]> {
  const { data } = await client.database
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (!data) return [];

  return data.map((a: Record<string, unknown>) => ({
    ...a,
    answers: typeof a.answers === 'string' ? JSON.parse(a.answers as string) : a.answers,
  })) as QuizAttempt[];
}
