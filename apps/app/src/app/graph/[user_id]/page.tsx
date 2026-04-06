'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Three.js
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">Loading 3D graph...</p>
      </div>
    </div>
  )
});

interface GraphNode {
  id: string;
  name: string;
  type: string;
  color: string;
  val: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
  value?: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  user: {
    name: string;
    email: string;
    company_id: string | null;
  };
}

export default function GraphPage() {
  const params = useParams();
  const user_id = params.user_id as string;
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch(`/api/graph/${user_id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch graph data');
        }
        const data = await response.json();
        setGraphData(data);
      } catch (err) {
        console.error('Error fetching graph:', err);
        setError(err instanceof Error ? err.message : 'Failed to load graph');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [user_id]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    
    // Focus camera on clicked node
    const distance = 150;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
    
    if (graphRef.current) {
      graphRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        2000
      );
    }
  }, []);

  const getNodeLabel = useCallback((node: any) => {
    const n = node as GraphNode;
    let label = n.name;
    if (n.type === 'contract_won') {
      const link = graphData?.links.find(l => l.target === n.id && l.value);
      if (link?.value) {
        label += ` (£${(link.value / 1000).toFixed(0)}K)`;
      }
    }
    return label;
  }, [graphData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading skills graph...</p>
        </div>
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'No graph data available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 backdrop-blur-md bg-black/50 border-b border-white/10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                Skills Graph - {graphData.user.name}
              </h1>
              <p className="text-sm mt-1 text-gray-400">
                {graphData.nodes.length} nodes • {graphData.links.length} connections
              </p>
            </div>
            <a 
              href="/" 
              className="px-4 py-2 text-sm rounded-lg transition-all hover:bg-white/10 text-gray-300 border border-white/20"
            >
              Back to Chat
            </a>
          </div>
        </div>
      </div>

      {/* 3D Graph */}
      <div style={{ width: '100vw', height: '100vh' }}>
        <ForceGraph3D
          ref={graphRef}
          graphData={graphData}
          nodeId="id"
          nodeLabel={getNodeLabel}
          nodeColor="color"
          nodeVal="val"
          nodeOpacity={0.95}
          nodeResolution={16}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.15}
          linkWidth={2}
          linkOpacity={0.5}
          linkLabel="type"
          backgroundColor="#0a0a0a"
          showNavInfo={false}
          onNodeClick={handleNodeClick}
          nodeThreeObject={(node: any) => {
            const n = node as GraphNode;
            // Use SpriteText for labels
            const SpriteText = require('three-spritetext').default;
            const sprite = new SpriteText(n.name);
            sprite.material.depthWrite = false;
            sprite.color = n.color;
            sprite.textHeight = 5;
            sprite.position.y = -n.val * 0.5 - 8;
            return sprite;
          }}
        />
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div 
          className="absolute top-20 right-4 p-4 rounded-lg shadow-2xl max-w-xs backdrop-blur-md bg-black/80 border border-white/20"
        >
          <h3 className="font-semibold mb-2 text-white">
            {selectedNode.name}
          </h3>
          <div className="text-sm space-y-1 text-gray-300">
            <p>Type: <span className="text-white">{selectedNode.type.replace(/_/g, ' ')}</span></p>
            {selectedNode.type === 'contract_won' && (
              <p className="text-green-400">Status: Won ✅</p>
            )}
            {selectedNode.type === 'contract_won' && (
              <p>
                Value: £{
                  graphData.links.find(l => l.target === selectedNode.id)?.value 
                    ? (graphData.links.find(l => l.target === selectedNode.id)!.value! / 1000).toFixed(0) + 'K'
                    : 'N/A'
                }
              </p>
            )}
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="mt-3 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Legend */}
      <div 
        className="absolute bottom-4 left-4 p-3 rounded-lg backdrop-blur-md bg-black/80 border border-white/20"
      >
        <p className="text-xs font-semibold mb-2 text-white">
          Node Types
        </p>
        <div className="space-y-1 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#4A90E2' }}></span>
            <span>Person / Buyer</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#50E3C2' }}></span>
            <span>Company</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#7ED321' }}></span>
            <span>Won Contract</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#9013FE' }}></span>
            <span>Sector</span>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500">
        Click and drag to rotate • Scroll to zoom • Click nodes for details
      </div>
    </div>
  );
}