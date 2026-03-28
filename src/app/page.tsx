import Link from 'next/link';
import { BookOpen, Brain, Sparkles, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">AdaptLearn</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Reading that adapts to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              your level
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Upload any document and our AI rewrites it to match your knowledge level in real-time.
            Generate mind maps, track your progress, and learn more effectively.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-base">
                Start learning free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">AI-Adapted Content</h3>
            <p className="text-sm text-muted-foreground">
              Content is rewritten in real-time to match your background. From beginner-friendly
              explanations to expert-level depth.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
              <Map className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Auto Mind Maps</h3>
            <p className="text-sm text-muted-foreground">
              AI extracts key concepts and relationships from your readings and generates
              interactive, explorable mind maps.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <Brain className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Knowledge Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Your knowledge profile evolves as you read. The platform learns your level and adapts
              content automatically over time.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          AdaptLearn — Adaptive Learning Platform
        </div>
      </footer>
    </div>
  );
}
