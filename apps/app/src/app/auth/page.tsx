'use client';

import { AuthView } from '@neondatabase/neon-js/auth/react/ui';

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background, #F7F7F9)' }}>
      <AuthView pathname="sign-in" />
    </div>
  );
}
