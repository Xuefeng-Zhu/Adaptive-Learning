import { insforge } from '@/lib/insforge';
import type { MindMapNode, MindMapEdge } from '@/types';

interface ExtractedGraph {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export async function extractConceptMap(
  sections: Array<{ heading: string | null; body: string; section_order: number }>
): Promise<ExtractedGraph> {
  // Build a condensed version of the content for the AI
  const condensed = sections
    .map((s) => {
      const heading = s.heading ? `## ${s.heading}\n` : '';
      const preview = s.body.slice(0, 300);
      return `[Section ${s.section_order}]\n${heading}${preview}`;
    })
    .join('\n\n');

  const response = await insforge.ai.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a knowledge graph extraction expert. Extract key concepts and their relationships from documents. Always return valid JSON.`,
      },
      {
        role: 'user',
        content: `Analyze this document and extract a concept map. Return a JSON object:
{
  "nodes": [
    { "id": "n1", "label": "Concept Name", "description": "Brief 1-sentence description", "importance": 3, "sectionOrder": 0 }
  ],
  "edges": [
    { "source": "n1", "target": "n2", "relationship": "relates to" }
  ]
}

Rules:
- Create 8-20 nodes representing key concepts
- importance: 1-5 (5 = most important)
- sectionOrder: which document section this concept primarily appears in
- Identify ONE root/central concept (highest importance)
- Create meaningful relationship labels on edges
- Return ONLY valid JSON

Document:
---
${condensed}
---`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || '';
  return parseGraphResponse(text);
}

function parseGraphResponse(text: string): ExtractedGraph {
  let jsonStr = text.trim();

  // Remove markdown code fences
  const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();

  try {
    const parsed = JSON.parse(jsonStr);
    const nodes: MindMapNode[] = (parsed.nodes || []).map(
      (n: { id?: string; label?: string; description?: string; importance?: number; sectionOrder?: number }, i: number) => ({
        id: n.id || `n${i}`,
        label: n.label || `Concept ${i + 1}`,
        description: n.description || '',
        importance: Math.max(1, Math.min(5, n.importance || 3)),
        sectionOrder: n.sectionOrder ?? 0,
      })
    );

    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges: MindMapEdge[] = (parsed.edges || [])
      .filter((e: { source?: string; target?: string }) => nodeIds.has(e.source!) && nodeIds.has(e.target!))
      .map((e: { source: string; target: string; relationship?: string }) => ({
        source: e.source,
        target: e.target,
        relationship: e.relationship || 'relates to',
      }));

    return { nodes, edges };
  } catch {
    return {
      nodes: [{ id: 'n1', label: 'Document', description: 'Main concept', importance: 5, sectionOrder: 0 }],
      edges: [],
    };
  }
}

// Simple tree layout algorithm
export function computeTreeLayout(
  nodes: MindMapNode[],
  edges: MindMapEdge[]
): Array<{ id: string; x: number; y: number }> {
  if (nodes.length === 0) return [];

  // Find root (highest importance)
  const sorted = [...nodes].sort((a, b) => b.importance - a.importance);
  const rootId = sorted[0].id;

  // Build adjacency list
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const edge of edges) {
    if (!children.has(edge.source)) children.set(edge.source, []);
    children.get(edge.source)!.push(edge.target);
    hasParent.add(edge.target);
  }

  // BFS from root to assign positions
  const positions: Array<{ id: string; x: number; y: number }> = [];
  const visited = new Set<string>();

  const queue: Array<{ id: string; depth: number; index: number; siblingCount: number }> = [
    { id: rootId, depth: 0, index: 0, siblingCount: 1 },
  ];
  visited.add(rootId);

  // Also add orphan nodes
  const orphans = nodes.filter((n) => n.id !== rootId && !hasParent.has(n.id));
  for (let i = 0; i < orphans.length; i++) {
    if (!visited.has(orphans[i].id)) {
      queue.push({
        id: orphans[i].id,
        depth: 1,
        index: i,
        siblingCount: orphans.length,
      });
      visited.add(orphans[i].id);
    }
  }

  const HORIZONTAL_SPACING = 250;
  const VERTICAL_SPACING = 120;
  const depthCounts = new Map<number, number>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    const count = depthCounts.get(depth) || 0;
    depthCounts.set(depth, count + 1);

    positions.push({
      id,
      x: count * HORIZONTAL_SPACING,
      y: depth * VERTICAL_SPACING,
    });

    const kids = children.get(id) || [];
    for (const kid of kids) {
      if (!visited.has(kid)) {
        visited.add(kid);
        queue.push({ id: kid, depth: depth + 1, index: 0, siblingCount: kids.length });
      }
    }
  }

  // Add any remaining unvisited nodes
  let extraIndex = 0;
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const maxDepth = Math.max(...Array.from(depthCounts.keys()), 0) + 1;
      positions.push({
        id: node.id,
        x: extraIndex * HORIZONTAL_SPACING,
        y: maxDepth * VERTICAL_SPACING,
      });
      extraIndex++;
    }
  }

  // Center the layout
  const minX = Math.min(...positions.map((p) => p.x));
  const maxX = Math.max(...positions.map((p) => p.x));
  const offsetX = -(minX + maxX) / 2;

  return positions.map((p) => ({ ...p, x: p.x + offsetX + 400 }));
}
