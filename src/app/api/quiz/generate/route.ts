import { NextRequest, NextResponse } from 'next/server';
import { createServerInsforge } from '@/lib/insforge-server';
import {
  buildQuizPrompt,
  parseQuizResponse,
  getCachedQuiz,
  saveQuiz,
  getQuizAttempts,
} from '@/services/quiz';

export async function POST(request: NextRequest) {
  try {
    const serverInsforge = createServerInsforge(request);

    const { data: authData } = await serverInsforge.auth.getCurrentUser();
    if (!authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;

    const { contentId, questionCount: rawCount } = await request.json();
    if (!contentId) {
      return NextResponse.json({ error: 'Missing contentId' }, { status: 400 });
    }

    const questionCount = Math.max(1, Math.min(10, rawCount || 5));

    // Check for existing cached quiz
    const cached = await getCachedQuiz(serverInsforge, contentId, userId);
    if (cached) {
      const attempts = await getQuizAttempts(serverInsforge, cached.id, userId);
      return NextResponse.json({ quiz: cached, attempts });
    }

    // Fetch content and sections
    const [contentRes, sectionsRes] = await Promise.all([
      serverInsforge.database.from('content').select('title').eq('id', contentId).single(),
      serverInsforge.database
        .from('content_sections')
        .select('*')
        .eq('content_id', contentId)
        .order('section_order', { ascending: true }),
    ]);

    if (!contentRes.data || !sectionsRes.data) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const sections = sectionsRes.data as Array<{
      id: string;
      heading: string | null;
      body: string;
      section_order: number;
    }>;

    // Generate quiz via AI
    const { system, user } = buildQuizPrompt(sections, contentRes.data.title, questionCount);

    const response = await serverInsforge.ai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const text = response.choices[0]?.message?.content || '';
    const questions = parseQuizResponse(text, sections);

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate quiz questions' },
        { status: 500 }
      );
    }

    // Save to database
    const quiz = await saveQuiz(serverInsforge, contentId, userId, questions, 'openai/gpt-4o-mini');
    if (!quiz) {
      return NextResponse.json({ error: 'Failed to save quiz' }, { status: 500 });
    }

    return NextResponse.json({ quiz, attempts: [] });
  } catch (err) {
    console.error('Quiz generation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
