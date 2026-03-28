'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ConceptNode } from './concept-node';

interface MindMapNodeData {
  id: string;
  label: string;
  description: string;
  importance: number;
  sectionOrder: number;
  x: number;
  y: number;
}

interface MindMapEdgeData {
  id: string;
  source: string;
  target: string;
  relationship: string;
}

interface MindMapCanvasProps {
  nodesData: MindMapNodeData[];
  edgesData: MindMapEdgeData[];
  onNodeClick?: (sectionOrder: number) => void;
}

const nodeTypes = { concept: ConceptNode };

export function MindMapCanvas({ nodesData, edgesData, onNodeClick }: MindMapCanvasProps) {
  const initialNodes: Node[] = useMemo(
    () =>
      nodesData.map((n) => ({
        id: n.id,
        type: 'concept',
        position: { x: n.x, y: n.y },
        data: {
          label: n.label,
          description: n.description,
          importance: n.importance,
          sectionOrder: n.sectionOrder,
        },
      })),
    [nodesData]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      edgesData.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.relationship,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
        labelStyle: { fontSize: 10, fill: '#64748b' },
      })),
    [edgesData]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const sectionOrder = node.data?.sectionOrder;
      if (typeof sectionOrder === 'number' && onNodeClick) {
        onNodeClick(sectionOrder);
      }
    },
    [onNodeClick]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          style={{ height: 100, width: 140 }}
        />
      </ReactFlow>
    </div>
  );
}
