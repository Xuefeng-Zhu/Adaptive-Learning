'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/hooks/use-auth';
import type { Content } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, BookOpen, FileText } from 'lucide-react';

export default function LibraryPage() {
  const { user } = useAuth();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await insforge.database
        .from('content')
        .select('*')
        .eq('status', 'ready')
        .or(`uploader_id.eq.${user!.id},is_public.eq.true`)
        .order('created_at', { ascending: false });
      if (data) {
        setContent(data as Content[]);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const filtered = content.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.summary?.toLowerCase().includes(search.toLowerCase()) ||
      c.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Library</h1>
        <p className="text-muted-foreground">Browse and search your documents.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by title, summary, or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="font-semibold">
              {search ? 'No results found' : 'No content yet'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? 'Try a different search term.'
                : 'Upload a document to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Link key={item.id} href={`/read/${item.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                <CardContent className="pt-6">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs uppercase text-muted-foreground">
                      {item.source_type.replace('_', ' ')}
                    </span>
                    {item.difficulty && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        Difficulty: {item.difficulty}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold line-clamp-2">{item.title}</h3>
                  {item.summary && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                      {item.summary}
                    </p>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {item.word_count.toLocaleString()} words
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
