'use client';

import ReactFlow, { Background, Controls, MiniMap, type Edge, type Node } from 'reactflow';
import 'reactflow/dist/style.css';

import type { TemplateCanvasSchema } from '@/lib/onboarding/types';

interface TemplateCanvasProps {
  schema: TemplateCanvasSchema;
}

export const TemplateCanvas = ({ schema }: TemplateCanvasProps) => {
  const nodes = schema.nodes as Node[];
  const edges = schema.edges as Edge[];

  return (
    <div className="h-64 w-full rounded-lg border border-slate-200 bg-white" data-testid="template-canvas-preview">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap pannable={false} zoomable={false} />
        <Controls showInteractive={false} fitViewOptions={{ padding: 0.2 }} />
        <Background gap={24} size={1} color="#e2e8f0" />
      </ReactFlow>
    </div>
  );
};
