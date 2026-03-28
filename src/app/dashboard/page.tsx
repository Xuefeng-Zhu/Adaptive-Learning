'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/hooks/use-auth';
import type { Content, ReadingProgress } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Upload, Library, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [recentContent, setRecentContent] = useState<Content[]>([]);
  const [recentProgress, setRecentProgress] = useState<ReadingProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalContent: 0, totalReading: 0, totalTime: 0 });

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [contentRes, progressRes] = await Promise.all([
        insforge.database
          .from('content')
          .select('*')
          .eq('uploader_id', user!.id)
          .eq('status', 'ready')
          .order('created_at', { ascending: false })
          .limit(5),
        insforge.database
          .from('reading_progress')
          .select('*')
          .eq('user_id', user!.id)
          .order('last_read_at', { ascending: false })
          .limit(5),
      ]);

      if (contentRes.data) setRecentContent(contentRes.data as Content[]);
      if (progressRes.data) {
        const progress = progressRes.data as ReadingProgress[];
        setRecentProgress(progress);
        setStats({
          totalContent: contentRes.data?.length ?? 0,
          totalReading: progress.length,
          totalTime: progress.reduce((sum, p) => sum + p.time_spent_seconds, 0),
        });
      }
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{user?.profile?.name ? `, ${user.profile.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground">Here&apos;s your learning overview.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <Library className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalContent}</p>
              <p className="text-sm text-muted-foreground">Documents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalReading}</p>
              <p className="text-sm text-muted-foreground">Articles read</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
              <Clock className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Math.round(stats.totalTime / 60)}m
              </p>
              <p className="text-sm text-muted-foreground">Reading time</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link href="/dashboard/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" /> Upload content
          </Button>
        </Link>
        <Link href="/dashboard/library">
          <Button variant="outline">
            <Library className="mr-2 h-4 w-4" /> Browse library
          </Button>
        </Link>
      </div>

      {/* Recent Content */}
      {recentContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentContent.map((item) => (
                <Link
                  key={item.id}
                  href={`/read/${item.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.title}</p>
                    {item.summary && (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {item.summary}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    {item.tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recentContent.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="font-semibold">No content yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a document or import a URL to get started.
            </p>
            <Link href="/dashboard/upload">
              <Button className="mt-4">
                <Upload className="mr-2 h-4 w-4" /> Upload your first document
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
