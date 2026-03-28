export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_topic_id: string | null;
  created_at: string;
}

export interface Content {
  id: string;
  title: string;
  source_type: 'upload_pdf' | 'upload_text' | 'url_import' | 'curated' | 'chat_generated';
  source_url: string | null;
  original_text: string;
  summary: string | null;
  tags: string[];
  difficulty: number | null;
  word_count: number;
  status: 'processing' | 'ready' | 'failed';
  topic_id: string | null;
  uploader_id: string;
  file_url: string | null;
  file_key: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  topics?: Topic;
}

export interface ContentSection {
  id: string;
  content_id: string;
  section_order: number;
  heading: string | null;
  body: string;
  word_count: number;
}

export interface KnowledgeProfile {
  id: string;
  user_id: string;
  topic_id: string;
  level: number;
  assessment_history: Array<{ date: string; score: number; source: string }>;
  last_assessed_at: string | null;
  created_at: string;
  updated_at: string;
  topics?: Topic;
}

export interface AdaptedContent {
  id: string;
  content_id: string;
  section_id: string;
  user_id: string;
  adapted_text: string;
  adaptation_level: number;
  model_used: string | null;
  cached_at: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  description: string;
  importance: number;
  sectionOrder: number;
}

export interface MindMapEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface MindMap {
  id: string;
  content_id: string;
  user_id: string;
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  layout: string;
  created_at: string;
  updated_at: string;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  content_id: string;
  percent_complete: number;
  time_spent_seconds: number;
  current_section_order: number;
  highlights: Array<{
    sectionId: string;
    startOffset: number;
    endOffset: number;
    text: string;
    color: string;
  }>;
  notes: Array<{
    sectionId: string;
    text: string;
    createdAt: string;
  }>;
  started_at: string;
  last_read_at: string;
  completed_at: string | null;
}

export interface UserProfile {
  id: string;
  name?: string;
  avatar_url?: string;
  email?: string;
  education_level?: string;
  profession?: string;
  interests?: string;
  onboarding_complete?: boolean;
  preferred_adaptation_level?: number;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string | null;
  generated_content_id: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: { content_generated?: boolean; content_id?: string } | null;
  created_at: string;
}
