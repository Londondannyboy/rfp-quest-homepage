'use client';

import { useEffect, useState } from 'react';

export default function DebugAuthPage() {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        console.log('Fetching user context...');
        const response = await fetch('/api/user-context');
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        setContext(data);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Auth Debug Page</h1>
      
      {loading && <div>Loading...</div>}
      
      {error && (
        <div style={{ color: 'red' }}>
          <h3>Error:</h3>
          <pre>{error}</pre>
        </div>
      )}
      
      {context && (
        <div>
          <h3>User Context:</h3>
          <pre style={{ background: '#f5f5f5', padding: '10px' }}>
            {JSON.stringify(context, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => window.location.reload()}>
          Refresh
        </button>
        <a href="/auth" style={{ marginLeft: '10px' }}>
          Go to Auth Page
        </a>
        <a href="/" style={{ marginLeft: '10px' }}>
          Back to Home
        </a>
      </div>
    </div>
  );
}