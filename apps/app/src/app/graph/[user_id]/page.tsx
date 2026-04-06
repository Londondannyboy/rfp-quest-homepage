'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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
    <div className="min-h-screen" style={{ background: 'var(--background, #F7F7F9)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--color-border-tertiary, #e5e7eb)' }}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Skills Graph - {graphData.user.name}
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {graphData.nodes.length} nodes • {graphData.links.length} connections
              </p>
            </div>
            <a 
              href="/" 
              className="px-4 py-2 text-sm rounded-lg transition-colors"
              style={{
                color: 'var(--text-secondary)',
                border: '1px solid var(--color-border-glass, rgba(0,0,0,0.1))',
                background: 'var(--surface-primary, rgba(255,255,255,0.6))',
              }}
            >
              Back to Chat
            </a>
          </div>
        </div>
      </div>

      {/* Graph Visualization - Simple Node List for now */}
      <div className="p-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {graphData.nodes.map((node) => {
            const relatedLinks = graphData.links.filter(
              l => l.source === node.id || l.target === node.id
            );
            
            return (
              <div
                key={node.id}
                className="p-6 rounded-xl shadow-sm"
                style={{
                  background: 'var(--surface-primary, white)',
                  border: `2px solid ${node.color}`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {node.name}
                  </h3>
                  <span 
                    className="px-2 py-1 text-xs rounded-full"
                    style={{
                      background: `${node.color}20`,
                      color: node.color,
                    }}
                  >
                    {node.type.replace(/_/g, ' ')}
                  </span>
                </div>
                
                {relatedLinks.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Connections:
                    </p>
                    {relatedLinks.map((link, idx) => {
                      const connectedNode = graphData.nodes.find(
                        n => n.id === (link.source === node.id ? link.target : link.source)
                      );
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {link.type.replace(/_/g, ' ')}
                          </span>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {connectedNode?.name}
                          </span>
                          {link.value && (
                            <span style={{ color: 'var(--color-mint-dark)' }}>
                              £{(link.value / 1000).toFixed(0)}K
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Note about 3D visualization */}
        <div className="mt-12 p-4 rounded-lg text-center" 
          style={{
            background: 'var(--surface-secondary, rgba(255,255,255,0.5))',
            border: '1px solid var(--color-border-glass)',
          }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            3D force-directed graph visualization coming soon. 
            Currently showing node relationships in card format.
          </p>
        </div>
      </div>
    </div>
  );
}