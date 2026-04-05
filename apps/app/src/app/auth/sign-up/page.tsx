'use client';

import { useActionState } from 'react';
import { signUpWithEmail } from './actions';
import Link from 'next/link';

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);

  return (
    <form action={formAction}
      className="flex flex-col gap-5 min-h-screen items-center justify-center"
      style={{ background: 'var(--background, #F7F7F9)' }}>

      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Create your RFP.quest account
        </h1>
      </div>

      <div className="flex flex-col gap-1.5 w-full max-w-sm">
        <label htmlFor="name" className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Name</label>
        <input id="name" name="name" type="text" required placeholder="Jane Smith"
          className="block rounded-lg w-full px-3 py-2 text-sm outline-none"
          style={{ border: '1px solid var(--border-default, #e5e7eb)', background: 'var(--surface-secondary, #fafafa)' }}
        />
      </div>

      <div className="flex flex-col gap-1.5 w-full max-w-sm">
        <label htmlFor="email" className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Work email</label>
        <input id="email" name="email" type="email" required placeholder="jane@acme.co.uk"
          className="block rounded-lg w-full px-3 py-2 text-sm outline-none"
          style={{ border: '1px solid var(--border-default, #e5e7eb)', background: 'var(--surface-secondary, #fafafa)' }}
        />
      </div>

      <div className="flex flex-col gap-1.5 w-full max-w-sm">
        <label htmlFor="password" className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Password</label>
        <input id="password" name="password" type="password" required placeholder="Min 8 characters"
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
        {isPending ? 'Creating account...' : 'Create account'}
      </button>

      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        Already have an account?{' '}
        <Link href="/auth/sign-in" className="font-medium" style={{ color: 'var(--color-lilac-dark, #9599CC)' }}>Sign in</Link>
      </p>
    </form>
  );
}
