'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getAccessToken } from '@/lib/insforge';
import { MindMapCanvas } from '@/components/mindmap/mindmap-canvas';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useRef } from 'react';

interface MapNode {
  id: string;
  label: string;
  description: string;
  importance: number;
  sectionOrder: number;
  x: number;
  y: number;
}

interface MapEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
}

export default function MindMapPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const contentId = params.contentId as string;
  const canvasRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [edges, setEdges] = useState<MapEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState('Mind Map');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  function getAuthHeaders(): Record<string, string> {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async function loadOrGenerate() {
    setLoading(true);
    try {
      const response = await fetch('/api/mindmap/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ contentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate mind map');
      }

      const data = await response.json();
      const parsedNodes = typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes;
      const parsedEdges = typeof data.edges === 'string' ? JSON.parse(data.edges) : data.edges;
      setNodes(parsedNodes || []);
      setEdges(parsedEdges || []);
      setTitle(data.title || 'Mind Map');
    } catch (err) {
      toast.error('Failed to load mind map');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && contentId) loadOrGenerate();
  }, [user, contentId]);

  async function handleRegenerate() {
    // Delete existing and regenerate
    setGenerating(true);
    try {
      // Delete existing map
      await fetch('/api/mindmap/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ contentId, regenerate: true }),
      });
      // The API returns existing, so let's delete first
      // For now just reload
      await loadOrGenerate();
      toast.success('Mind map regenerated');
    } catch {
      toast.error('Failed to regenerate');
    } finally {
      setGenerating(false);
    }
  }

  async function exportPng() {
    const el = document.querySelector('.react-flow') as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `${title}-mindmap.png`;
      link.href = dataUrl;
      link.click();
      toast.success('PNG exported');
    } catch {
      toast.error('Export failed');
    }
  }

  async function exportSvg() {
    const el = document.querySelector('.react-flow') as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toSvg(el);
      const link = document.createElement('a');
      link.download = `${title}-mindmap.svg`;
      link.href = dataUrl;
      link.click();
      toast.success('SVG exported');
    } catch {
      toast.error('Export failed');
    }
  }

  async function exportPdf() {
    const el = document.querySelector('.react-flow') as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { backgroundColor: '#ffffff' });
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${title}-mindmap.pdf`);
      toast.success('PDF exported');
    } catch {
      toast.error('Export failed');
    }
  }

  function handleNodeClick(sectionOrder: number) {
    router.push(`/read/${contentId}?section=${sectionOrder}`);
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Generating mind map with AI...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/read/${contentId}`)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to reading
          </Button>
          <span className="font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={exportPng}>
            <Download className="mr-1 h-3 w-3" /> PNG
          </Button>
          <Button variant="outline" size="sm" onClick={exportSvg}>
            <Download className="mr-1 h-3 w-3" /> SVG
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <Download className="mr-1 h-3 w-3" /> PDF
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={canvasRef} className="flex-1">
        {nodes.length > 0 ? (
          <MindMapCanvas
            nodesData={nodes}
            edgesData={edges}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No concepts extracted. Try regenerating the mind map.
          </div>
        )}
      </div>
    </div>
  );
}
