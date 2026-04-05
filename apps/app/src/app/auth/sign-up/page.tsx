'use client';

import { useActionState } from 'react';
import { signUpWithEmail } from './actions';
import Link from 'next/link';

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background, #F7F7F9)' }}>
      <form action={formAction} className="w-full max-w-sm mx-4 p-8 rounded-2xl" style={{
        background: 'var(--surface-primary, #fff)',
        border: '1px solid var(--border-default, #e5e7eb)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--text-primary)' }}>
          Create your RFP.quest account
        </h1>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Full name
            </label>
            <input id="name" name="name" type="text" required placeholder="Jane Smith"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ border: '1px solid var(--border-default, #e5e7eb)', background: 'var(--surface-secondary, #fafafa)' }}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Work email
            </label>
            <input id="email" name="email" type="email" required placeholder="jane@acme.co.uk"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ border: '1px solid var(--border-default, #e5e7eb)', background: 'var(--surface-secondary, #fafafa)' }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input id="password" name="password" type="password" required placeholder="Min 8 characters"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ border: '1px solid var(--border-default, #e5e7eb)', background: 'var(--surface-secondary, #fafafa)' }}
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500 text-center">{state.error}</p>
          )}

          <button type="submit" disabled={isPending}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, var(--color-lilac-dark, #9599CC), var(--color-mint-dark, #1B936F))' }}>
            {isPending ? 'Creating account...' : 'Create account'}
          </button>
        </div>

        <p className="text-sm text-center mt-4" style={{ color: 'var(--text-tertiary)' }}>
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="font-medium" style={{ color: 'var(--color-lilac-dark, #9599CC)' }}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
