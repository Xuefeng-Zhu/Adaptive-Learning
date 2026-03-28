import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { extractConceptMap, computeTreeLayout } from '@/services/mindmap';

export async function POST(request: NextRequest) {
  try {
    const { data: authData } = await insforge.auth.getCurrentUser();
    if (!authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;

    const { contentId } = await request.json();
    if (!contentId) {
      return NextResponse.json({ error: 'Missing contentId' }, { status: 400 });
    }

    // Check for existing mind map
    const { data: existing } = await insforge.database
      .from('mind_maps')
      .select('*')
      .eq('content_id', contentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(existing);
    }

    // Fetch content and sections
    const [contentRes, sectionsRes] = await Promise.all([
      insforge.database.from('content').select('title').eq('id', contentId).single(),
      insforge.database
        .from('content_sections')
        .select('*')
        .eq('content_id', contentId)
        .order('section_order', { ascending: true }),
    ]);

    if (!contentRes.data || !sectionsRes.data) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Extract concepts using AI
    const { nodes: rawNodes, edges: rawEdges } = await extractConceptMap(
      sectionsRes.data as Array<{ heading: string | null; body: string; section_order: number }>
    );

    // Compute layout
    const positions = computeTreeLayout(rawNodes, rawEdges);

    // Build React Flow format
    const nodes = rawNodes.map((node) => {
      const pos = positions.find((p) => p.id === node.id);
      return {
        id: node.id,
        label: node.label,
        description: node.description,
        importance: node.importance,
        sectionOrder: node.sectionOrder,
        x: pos?.x ?? 0,
        y: pos?.y ?? 0,
      };
    });

    const edges = rawEdges.map((edge, i) => ({
      id: `e${i}`,
      source: edge.source,
      target: edge.target,
      relationship: edge.relationship,
    }));

    // Save to database
    const { data: saved, error: saveError } = await insforge.database
      .from('mind_maps')
      .insert({
        content_id: contentId,
        user_id: userId,
        title: contentRes.data.title || 'Mind Map',
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
        layout: 'tree',
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json({ error: 'Failed to save mind map' }, { status: 500 });
    }

    return NextResponse.json(saved);
  } catch (err) {
    console.error('Mind map generation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
