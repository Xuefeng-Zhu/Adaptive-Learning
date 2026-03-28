'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const importanceColors: Record<number, string> = {
  1: 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600',
  2: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
  3: 'bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-700',
  4: 'bg-violet-100 border-violet-300 dark:bg-violet-900 dark:border-violet-700',
  5: 'bg-violet-200 border-violet-400 dark:bg-violet-800 dark:border-violet-600',
};

const importanceSizes: Record<number, string> = {
  1: 'text-xs px-3 py-1.5',
  2: 'text-xs px-3 py-2',
  3: 'text-sm px-4 py-2',
  4: 'text-sm px-4 py-2.5 font-semibold',
  5: 'text-base px-5 py-3 font-bold',
};

function ConceptNodeComponent({ data }: NodeProps) {
  const importance = (data?.importance as number) || 3;
  const colorClass = importanceColors[importance] || importanceColors[3];
  const sizeClass = importanceSizes[importance] || importanceSizes[3];

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div
        className={`rounded-lg border-2 shadow-sm cursor-pointer transition-shadow hover:shadow-md ${colorClass} ${sizeClass}`}
        title={data?.description as string}
      >
        <div>{data?.label as string}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </>
  );
}

export const ConceptNode = memo(ConceptNodeComponent);
