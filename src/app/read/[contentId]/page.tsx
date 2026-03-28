'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/hooks/use-auth';
import { ADAPTATION_LEVELS } from '@/lib/constants';
import type { Content, ContentSection } from '@/types';
import { SectionRenderer } from '@/components/reader/section-renderer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { QuizDialog } from '@/components/quiz/quiz-dialog';
import { ArrowLeft, Map, ClipboardCheck, Loader2 } from 'lucide-react';

export default function ReadPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const contentId = params.contentId as string;

  const [content, setContent] = useState<Content | null>(null);
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [adaptationLevel, setAdaptationLevel] = useState<number>(3);
  const [activeSection, setActiveSection] = useState<number>(0);
  const [quizOpen, setQuizOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!contentId || !user) return;
    async function load() {
      try {
        const [contentRes, sectionsRes] = await Promise.all([
          insforge.database
            .from('content')
            .select('*')
            .eq('id', contentId)
            .single(),
          insforge.database
            .from('content_sections')
            .select('*')
            .eq('content_id', contentId)
            .order('section_order', { ascending: true }),
        ]);

        if (contentRes.data) setContent(contentRes.data as Content);
        if (sectionsRes.data) setSections(sectionsRes.data as ContentSection[]);

        // Determine user's adaptation level for this content's topic
        if (contentRes.data?.topic_id) {
          const { data: profile } = await insforge.database
            .from('knowledge_profiles')
            .select('level')
            .eq('user_id', user!.id)
            .eq('topic_id', contentRes.data.topic_id)
            .maybeSingle();

          if (profile) {
            const lvl = profile.level;
            if (lvl <= 20) setAdaptationLevel(1);
            else if (lvl <= 40) setAdaptationLevel(2);
            else if (lvl <= 60) setAdaptationLevel(3);
            else if (lvl <= 80) setAdaptationLevel(4);
            else setAdaptationLevel(5);
          }
        }

        // Upsert reading progress
        const { data: existing } = await insforge.database
          .from('reading_progress')
          .select('id')
          .eq('user_id', user!.id)
          .eq('content_id', contentId)
          .maybeSingle();

        if (!existing) {
          await insforge.database.from('reading_progress').insert({
            user_id: user!.id,
            content_id: contentId,
            percent_complete: 0,
            time_spent_seconds: 0,
            current_section_order: 0,
          });
        } else {
          await insforge.database
            .from('reading_progress')
            .update({ last_read_at: new Date().toISOString() })
            .eq('id', existing.id);
        }
      } catch (err) {
        console.error('Failed to load content:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [contentId, user]);

  // Track reading progress
  const updateProgress = useCallback(
    async (sectionOrder: number) => {
      if (!user || !contentId || sections.length === 0) return;
      setActiveSection(sectionOrder);
      const percent = ((sectionOrder + 1) / sections.length) * 100;
      await insforge.database
        .from('reading_progress')
        .update({
          percent_complete: Math.min(100, percent),
          current_section_order: sectionOrder,
          last_read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('content_id', contentId);
    },
    [user, contentId, sections.length]
  );

  const currentLevelInfo = ADAPTATION_LEVELS.find((l) => l.value === adaptationLevel);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen p-6">
        <Skeleton className="mx-auto h-8 w-64" />
        <Skeleton className="mx-auto mt-4 h-4 w-96" />
        <Skeleton className="mx-auto mt-8 h-96 max-w-3xl" />
      </div>
    );
  }

  if (!user) return null;

  if (!content) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Content not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-3 sm:flex">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Level: {currentLevelInfo?.label}
              </span>
              <Slider
                value={[adaptationLevel]}
                onValueChange={(v) => setAdaptationLevel(Array.isArray(v) ? v[0] : v)}
                min={1}
                max={5}
                step={1}
                className="w-32"
              />
            </div>

            <Link href={`/read/${contentId}/mindmap`}>
              <Button variant="outline" size="sm">
                <Map className="mr-1 h-4 w-4" /> Mind Map
              </Button>
            </Link>

            {sections.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setQuizOpen(true)}>
                <ClipboardCheck className="mr-1 h-4 w-4" /> Quiz
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">{content.title}</h1>
          {content.summary && (
            <p className="mt-3 text-lg text-muted-foreground">{content.summary}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {content.tags?.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {content.difficulty && (
              <Badge variant="outline">Difficulty: {content.difficulty}/100</Badge>
            )}
            <Badge variant="outline">{content.word_count.toLocaleString()} words</Badge>
          </div>
        </header>

        {/* Mobile level slider */}
        <div className="mb-6 flex items-center gap-3 sm:hidden">
          <span className="text-xs text-muted-foreground">Level: {currentLevelInfo?.label}</span>
          <Slider
            value={[adaptationLevel]}
            onValueChange={(v) => setAdaptationLevel(Array.isArray(v) ? v[0] : v)}
            min={1}
            max={5}
            step={1}
            className="flex-1"
          />
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              contentId={contentId}
              adaptationLevel={adaptationLevel}
              onVisible={() => updateProgress(section.section_order)}
            />
          ))}
        </div>

        {sections.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p>No sections available for this content.</p>
          </div>
        )}
      </article>

      {/* Quiz Dialog */}
      {sections.length > 0 && (
        <QuizDialog
          contentId={contentId}
          contentTitle={content.title}
          open={quizOpen}
          onOpenChange={setQuizOpen}
        />
      )}
    </div>
  );
}
