import type { InsForgeClient } from '@insforge/sdk';
import { knowledgeLevelToAdaptation, educationToDefaultLevel } from '@/lib/constants';

const LEVEL_INSTRUCTIONS: Record<number, string> = {
  1: `Adaptation Level: BEGINNER
- Replace ALL jargon with everyday language
- Add brief parenthetical definitions for any technical term
- Use simple sentence structures and short paragraphs
- Add real-world analogies for complex ideas
- Target: 8th grade reading level`,

  2: `Adaptation Level: ELEMENTARY
- Simplify technical vocabulary but keep commonly-known terms
- Add brief inline explanations for specialized concepts
- Use clear, direct sentences
- Include one analogy per complex concept
- Target: introductory college course`,

  3: `Adaptation Level: INTERMEDIATE
- Keep standard terminology, explain only advanced or niche terms
- Maintain moderate sentence complexity
- Assume general subject familiarity
- Add context only where helpful
- Target: someone with basic knowledge`,

  4: `Adaptation Level: ADVANCED
- Preserve full technical vocabulary
- Only clarify highly specialized or ambiguous terms
- Maintain original complexity
- Reference related advanced concepts where relevant
- Target: experienced practitioner`,

  5: `Adaptation Level: EXPERT
- Preserve original style and vocabulary entirely
- Enhance with precise nuances, edge cases, caveats
- Add connections to advanced related topics
- Focus on depth, not simplification
- Target: domain expert`,
};

export function buildAdaptationPrompt(
  sectionBody: string,
  adaptationLevel: number,
  educationLevel: string | null,
  profession: string | null
): { system: string; user: string } {
  const level = Math.max(1, Math.min(5, adaptationLevel));

  const system = `You are an expert educational content adapter. Your job is to rewrite content to match a specific reader's knowledge level while preserving ALL factual information, key concepts, and logical flow.

Rules:
- NEVER add information not present in the original
- NEVER remove key facts or conclusions  
- Preserve the meaning and intent of every statement
- Maintain the same overall structure
- Keep the adapted version within 80-120% of the original word count
- Format using Markdown with appropriate headings, lists, and emphasis
- If the original contains code, preserve code blocks but adjust comments
- Output ONLY the adapted text, no meta-commentary`;

  const user = `${LEVEL_INSTRUCTIONS[level]}

Reader profile:
- Education: ${educationLevel || 'not specified'}
- Profession: ${profession || 'not specified'}

Rewrite the following content section according to the adaptation level above:

---
${sectionBody}
---`;

  return { system, user };
}

export async function getAdaptationLevel(
  client: InsForgeClient,
  userId: string,
  topicId: string | null,
  educationLevel: string | null,
  override?: number
): Promise<number> {
  if (override && override >= 1 && override <= 5) return override;

  if (topicId) {
    const { data } = await client.database
      .from('knowledge_profiles')
      .select('level')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .maybeSingle();

    if (data) return knowledgeLevelToAdaptation(data.level);
  }

  return educationToDefaultLevel(educationLevel);
}

export async function getCachedAdaptation(
  client: InsForgeClient,
  contentId: string,
  sectionId: string,
  userId: string,
  adaptationLevel: number
): Promise<string | null> {
  const { data } = await client.database
    .from('adapted_content')
    .select('adapted_text')
    .eq('content_id', contentId)
    .eq('section_id', sectionId)
    .eq('user_id', userId)
    .eq('adaptation_level', adaptationLevel)
    .maybeSingle();

  return data?.adapted_text || null;
}

export async function cacheAdaptation(
  client: InsForgeClient,
  contentId: string,
  sectionId: string,
  userId: string,
  adaptationLevel: number,
  adaptedText: string,
  modelUsed: string
): Promise<void> {
  await client.database.from('adapted_content').insert({
    content_id: contentId,
    section_id: sectionId,
    user_id: userId,
    adapted_text: adaptedText,
    adaptation_level: adaptationLevel,
    model_used: modelUsed,
  });
}
