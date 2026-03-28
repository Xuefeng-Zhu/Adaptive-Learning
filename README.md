# AdaptLearn - Adaptive Learning Platform

An AI-powered adaptive reading platform that adjusts content difficulty to match each user's knowledge level, generates interactive mind maps, and tracks learning progress.

## Features

- **AI-Adapted Reading** - Content dynamically rewritten across 5 difficulty levels (Beginner to Expert) with real-time streaming
- **Auto-Generated Mind Maps** - AI extracts key concepts and relationships into interactive, explorable visualizations with PNG/SVG/PDF export
- **Content Upload & Import** - Upload PDF, TXT, or Markdown files (up to 20MB), or import directly from URLs
- **Knowledge Tracking** - Per-topic knowledge profiles, reading progress, highlights, and notes
- **Smart Caching** - Adapted content cached per user/section/level to minimize redundant AI calls
- **Lazy Adaptation** - Sections adapted on scroll via IntersectionObserver for long-document performance
- **Dark Mode** - Built-in theme switching with OKLCH color scheme

## Tech Stack

- **Next.js 15** with App Router and TypeScript
- **Tailwind CSS 4** with shadcn/ui components
- **@xyflow/react** for mind map visualization
- **InsForge SDK** for authentication, database, storage, and AI
- **react-markdown** for content rendering
- **jsPDF** + **html-to-image** for export functionality

## Getting Started

### Prerequisites

- Node.js 18+
- An InsForge project with the required database tables

### Install Dependencies

```bash
npm install
```

### Environment Variables

Copy the example env file and fill in your InsForge credentials:

```bash
cp env.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_INSFORGE_BASE_URL=<your-insforge-url>
NEXT_PUBLIC_INSFORGE_ANON_KEY=<your-insforge-anon-key>
```

### Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Auth routes (login, register, onboarding)
│   ├── (dashboard)/               # Dashboard routes (home, upload, library, progress)
│   ├── api/
│   │   ├── adapt/route.ts         # Content adaptation streaming endpoint
│   │   └── mindmap/generate/route.ts  # Mind map generation endpoint
│   ├── read/[contentId]/          # Reader with adaptive content & mind map views
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   └── globals.css
├── components/
│   ├── layout/                    # Header, sidebar, providers
│   ├── reader/                    # Section renderer with streaming
│   ├── mindmap/                   # Mind map canvas & concept nodes
│   └── ui/                        # shadcn/ui components
├── hooks/
│   ├── use-auth.tsx               # Auth context & provider
│   └── use-adaptation-stream.ts   # Streaming adaptation hook
├── lib/
│   ├── insforge.ts                # InsForge client initialization
│   ├── constants.ts               # Education & adaptation level definitions
│   └── utils.ts                   # Helper functions
├── services/
│   ├── adaptation.ts              # Adaptation logic, prompts & caching
│   ├── content.ts                 # File upload, URL import & AI parsing
│   └── mindmap.ts                 # Concept extraction & tree layout
└── types/
    └── index.ts                   # TypeScript interfaces
```

## How It Works

### Content Adaptation

Documents are split into logical sections (~500 words each) by AI. When a user reads content, each section is adapted in real-time to one of 5 levels based on their knowledge profile:

| Knowledge Score | Level | Style |
|----------------|-------|-------|
| 0-20 | Beginner | 8th-grade reading, full definitions, analogies |
| 21-40 | Elementary | Basic terms with inline definitions |
| 41-60 | Intermediate | Standard terminology, moderate explanations |
| 61-80 | Advanced | Technical vocabulary, nuanced detail |
| 81-100 | Expert | Precise language, depth over simplification |

Users can also manually override the adaptation level with a slider.

### Mind Map Generation

AI extracts 8-20 key concepts from a document, scores their importance, and identifies relationships. A BFS-based tree layout algorithm positions nodes for an interactive React Flow visualization.

## Deployment

Deploy to Vercel or any platform that supports Next.js:

```bash
npm run build
npm run start
```

Ensure the InsForge environment variables are configured in your deployment environment.
