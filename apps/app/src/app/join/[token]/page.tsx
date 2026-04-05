'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth-required'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function processInvite() {
      // Check if user is authenticated
      try {
        const { data: session } = await authClient.getSession();
        if (!session?.user) {
          setStatus('auth-required');
          setMessage('Please sign in to accept this invitation.');
          return;
        }

        // Call API to accept the invitation
        const resp = await fetch(`/api/join/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: session.user.id }),
        });

        if (resp.ok) {
          setStatus('success');
          setMessage('You have joined the team! Redirecting...');
          setTimeout(() => router.push('/'), 2000);
        } else {
          const data = await resp.json().catch(() => ({}));
          setStatus('error');
          setMessage(data.error || 'Failed to accept invitation.');
        }
      } catch {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    }

    processInvite();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background, #F7F7F9)' }}>
      <div className="text-center p-8 rounded-2xl max-w-sm" style={{
        background: 'var(--surface-primary, #fff)',
        border: '1px solid var(--border-default, #e5e7eb)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          {status === 'loading' && 'Accepting invitation...'}
          {status === 'success' && 'Welcome to the team!'}
          {status === 'error' && 'Invitation error'}
          {status === 'auth-required' && 'Sign in required'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        {status === 'auth-required' && (
          <a href="/auth" className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-lilac-dark), var(--color-mint-dark))' }}>
            Sign in
          </a>
        )}
      </div>
    </div>
  );
}
