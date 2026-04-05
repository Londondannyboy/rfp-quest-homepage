'use client';

import { useActionState } from 'react';
import { signInWithEmail } from './actions';
import Link from 'next/link';

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);

  return (
    <form action={formAction}
      className="flex flex-col gap-5 min-h-screen items-center justify-center"
      style={{ background: 'var(--background, #F7F7F9)' }}>

      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Sign in to RFP.quest
        </h1>
      </div>

      <div className="flex flex-col gap-1.5 w-full max-w-sm">
        <label htmlFor="email" className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Email</label>
        <input id="email" name="email" type="email" required placeholder="jane@acme.co.uk"
          className="block rounded-lg w-full px-3 py-2 text-sm outline-none"
          style={{ border: '1px solid var(--border-default, #e5e7eb)', background: 'var(--surface-secondary, #fafafa)' }}
        />
      </div>

      <div className="flex flex-col gap-1.5 w-full max-w-sm">
        <label htmlFor="password" className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Password</label>
        <input id="password" name="password" type="password" required placeholder="Your password"
          className="block rounded-lg w-full px-3 py-2 text-sm outline-none"
          style={{ border: '1px solid var(--border-default, #e5e7eb)', background: 'var(--surface-secondary, #fafafa)' }}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}

      <button type="submit" disabled={isPending}
        className="w-full max-w-sm py-2.5 rounded-lg text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, var(--color-lilac-dark, #9599CC), var(--color-mint-dark, #1B936F))' }}>
        {isPending ? 'Signing in...' : 'Sign in'}
      </button>

      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        No account yet?{' '}
        <Link href="/auth/sign-up" className="font-medium" style={{ color: 'var(--color-lilac-dark, #9599CC)' }}>Create one</Link>
      </p>
    </form>
  );
}
