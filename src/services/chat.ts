import type { InsForgeClient } from '@insforge/sdk';
import type { ChatConversation, ChatMessage, UserProfile } from '@/types';

export async function createConversation(
  client: InsForgeClient,
  userId: string,
  contextContentId?: string
): Promise<string> {
  const row: Record<string, unknown> = {
    user_id: userId,
    status: 'active',
  };
  if (contextContentId) {
    row.context_content_id = contextContentId;
  }

  const { data, error } = await client.database
    .from('chat_conversations')
    .insert(row)
    .select('id');

  if (error || !data?.[0]) {
    throw new Error(error?.message || 'Failed to create conversation');
  }

  return data[0].id;
}

export async function findContentConversation(
  client: InsForgeClient,
  userId: string,
  contentId: string
): Promise<string | null> {
  const { data, error } = await client.database
    .from('chat_conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('context_content_id', contentId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id || null;
}

export async function listConversations(client: InsForgeClient, userId: string): Promise<ChatConversation[]> {
  const { data, error } = await client.database
    .from('chat_conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as ChatConversation[];
}

export async function getMessages(client: InsForgeClient, conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await client.database
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as ChatMessage[];
}

export async function addMessage(
  client: InsForgeClient,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: { content_generated?: boolean; content_id?: string }
): Promise<string> {
  const { data, error } = await client.database
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata: metadata || null,
    })
    .select('id');

  if (error || !data?.[0]) {
    throw new Error(error?.message || 'Failed to add message');
  }

  // Update conversation updated_at
  await client.database
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data[0].id;
}

export async function updateConversationTitle(
  client: InsForgeClient,
  conversationId: string,
  title: string
): Promise<void> {
  await client.database
    .from('chat_conversations')
    .update({ title })
    .eq('id', conversationId);
}

export async function linkGeneratedContent(
  client: InsForgeClient,
  conversationId: string,
  contentId: string
): Promise<void> {
  await client.database
    .from('chat_conversations')
    .update({ generated_content_id: contentId })
    .eq('id', conversationId);
}

export async function deleteConversation(
  client: InsForgeClient,
  conversationId: string,
  userId: string
): Promise<void> {
  await client.database
    .from('chat_conversations')
    .update({ status: 'archived' })
    .eq('id', conversationId)
    .eq('user_id', userId);
}

export function buildChatSystemPrompt(profile: UserProfile): string {
  return `You are AdaptLearn's Learning Initiator - an expert educational AI tutor. Your purpose is to help users explore topics they want to learn about.

Your role:
1. Understand what the user wants to learn
2. Ask 1-2 clarifying questions if the topic is broad (e.g., "What aspect of machine learning interests you most - theory, practical applications, or a specific algorithm?")
3. Once you understand their goals, have a natural educational conversation
4. When you have enough context, offer to generate a structured learning document by saying something like: "I can create a structured learning guide on this topic for you. Would you like me to generate it?"

Learner profile:
- Education level: ${profile.education_level || 'not specified'}
- Profession: ${profile.profession || 'not specified'}
- Interests: ${profile.interests || 'not specified'}

Guidelines:
- Adapt your language complexity to match the learner's education level
- Be conversational and encouraging, not formal or robotic
- Use analogies and examples relevant to their profession/interests when possible
- Keep responses concise (2-4 paragraphs max) unless the user asks for detail
- Use Markdown for formatting (headings, bold, lists) when appropriate
- Stay focused on educational topics and learning goals`;
}

export function buildContentChatSystemPrompt(
  profile: UserProfile,
  contentTitle: string,
  contentSummary: string | null,
  sectionTexts: string[]
): string {
  // Truncate section content to ~15,000 chars to leave room for conversation history
  let articleText = '';
  const maxChars = 15000;
  for (const text of sectionTexts) {
    if (articleText.length + text.length > maxChars) {
      const remaining = maxChars - articleText.length;
      if (remaining > 200) {
        articleText += text.slice(0, remaining) + '...(truncated)';
      }
      break;
    }
    articleText += text + '\n\n';
  }

  return `You are AdaptLearn's Reading Companion - an expert AI tutor helping a user understand an article they are currently reading.

Article being read:
- Title: ${contentTitle}
${contentSummary ? `- Summary: ${contentSummary}` : ''}

Article content:
---
${articleText.trim()}
---

Learner profile:
- Education level: ${profile.education_level || 'not specified'}
- Profession: ${profile.profession || 'not specified'}
- Interests: ${profile.interests || 'not specified'}

Your role:
1. Answer questions about this specific article
2. Explain difficult concepts from the article in simpler terms
3. Provide analogies relevant to the learner's background
4. Help the learner connect ideas across sections

Guidelines:
- Stay grounded in the article content - do not invent information not present in the article
- Keep responses concise (the user is mid-reading, not looking for lectures)
- Use Markdown for formatting when appropriate
- Adapt your language complexity to match the learner's education level
- If asked about something not covered in the article, say so and offer a brief general explanation`;
}
