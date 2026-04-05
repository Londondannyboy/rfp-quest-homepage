'use client';

import { authClient } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SignOutPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(true);

  useEffect(() => {
    authClient.signOut().then(() => {
      setSigningOut(false);
      setTimeout(() => router.push('/'), 1500);
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background, #F7F7F9)' }}>
      <div className="text-center p-8 rounded-2xl" style={{
        background: 'var(--surface-primary, #fff)',
        border: '1px solid var(--border-default, #e5e7eb)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {signingOut ? 'Signing out...' : 'Signed out'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {signingOut ? 'Please wait' : 'Redirecting to home...'}
        </p>
      </div>
    </div>
  );
}
