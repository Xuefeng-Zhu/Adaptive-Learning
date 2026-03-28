'use client';

import { useEffect, useState } from 'react';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/hooks/use-auth';
import type { KnowledgeProfile, ReadingProgress, Topic } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Clock, BookOpen } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';

export default function ProgressPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<(KnowledgeProfile & { topic_name?: string })[]>([]);
  const [progress, setProgress] = useState<(ReadingProgress & { content_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [profilesRes, progressRes, topicsRes] = await Promise.all([
        insforge.database
          .from('knowledge_profiles')
          .select('*')
          .eq('user_id', user!.id),
        insforge.database
          .from('reading_progress')
          .select('*')
          .eq('user_id', user!.id)
          .order('last_read_at', { ascending: false }),
        insforge.database.from('topics').select('*'),
      ]);

      const topicMap = new Map<string, string>();
      if (topicsRes.data) {
        (topicsRes.data as Topic[]).forEach((t) => topicMap.set(t.id, t.name));
      }

      if (profilesRes.data) {
        setProfiles(
          (profilesRes.data as KnowledgeProfile[]).map((p) => ({
            ...p,
            topic_name: topicMap.get(p.topic_id) || 'Unknown',
          }))
        );
      }

      if (progressRes.data) {
        // Fetch content titles
        const contentIds = (progressRes.data as ReadingProgress[]).map((p) => p.content_id);
        let contentMap = new Map<string, string>();
        if (contentIds.length > 0) {
          const { data: contentData } = await insforge.database
            .from('content')
            .select('id, title')
            .in('id', contentIds);
          if (contentData) {
            (contentData as { id: string; title: string }[]).forEach((c) =>
              contentMap.set(c.id, c.title)
            );
          }
        }
        setProgress(
          (progressRes.data as ReadingProgress[]).map((p) => ({
            ...p,
            content_title: contentMap.get(p.content_id) || 'Unknown',
          }))
        );
      }

      setLoading(false);
    }
    load();
  }, [user]);

  const radarData = profiles.map((p) => ({
    topic: p.topic_name,
    level: p.level,
  }));

  const totalTime = progress.reduce((sum, p) => sum + p.time_spent_seconds, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Learning Progress</h1>
        <p className="text-muted-foreground">Track your knowledge growth across topics.</p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <Brain className="h-8 w-8 text-violet-600" />
            <div>
              <p className="text-2xl font-bold">{profiles.length}</p>
              <p className="text-sm text-muted-foreground">Topics tracked</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{progress.length}</p>
              <p className="text-sm text-muted-foreground">Articles read</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <Clock className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{Math.round(totalTime / 60)}m</p>
              <p className="text-sm text-muted-foreground">Total reading time</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Radar */}
      {radarData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Knowledge Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="topic" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Knowledge Level"
                  dataKey="level"
                  stroke="hsl(262, 83%, 58%)"
                  fill="hsl(262, 83%, 58%)"
                  fillOpacity={0.2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Reading History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reading History</CardTitle>
        </CardHeader>
        <CardContent>
          {progress.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No reading history yet. Start reading to track your progress!
            </p>
          ) : (
            <div className="space-y-3">
              {progress.map((p) => (
                <Link
                  key={p.id}
                  href={`/read/${p.content_id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.content_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(p.time_spent_seconds / 60)}m reading time
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <Badge
                      variant={p.percent_complete >= 90 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {Math.round(p.percent_complete)}%
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
