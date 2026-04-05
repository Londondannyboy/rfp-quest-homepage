'use client';

import { SignedIn, SignedOut, UserButton } from '@neondatabase/neon-js/auth/react/ui';
import { authClient } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AccountPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background, #F7F7F9)' }}>
      <SignedIn>
        <div className="flex flex-col items-center gap-4">
          <UserButton />
          <button
            onClick={() => authClient.signOut().then(() => window.location.href = '/')}
            className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{ border: '1px solid var(--border-default, #e5e7eb)', color: 'var(--text-secondary)' }}
          >
            Sign out
          </button>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToAuth />
      </SignedOut>
    </div>
  );
}

function RedirectToAuth() {
  const router = useRouter();
  useEffect(() => { router.push('/auth'); }, [router]);
  return null;
}
