import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import { ActionForm } from '@/components/action-form';
import { authenticate, resetPassword } from '@/app/actions';
import { configured } from '@/lib/env';
export default async function AuthPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!['login', 'signup', 'forgot-password', 'reset-password'].includes(mode)) notFound();
  const signup = mode === 'signup',
    reset = mode.includes('password');
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <Brand />
      </div>
      <div className="auth-card">
        <p className="eyebrow">YOUR NEXT FIX STARTS HERE</p>
        <h1>
          {signup
            ? 'Build better, together.'
            : mode === 'login'
              ? 'Welcome back.'
              : mode === 'forgot-password'
                ? 'Reset your password.'
                : 'Choose a new password.'}
        </h1>
        <p className="muted">
          {signup
            ? 'A little more context. A lot less back-and-forth.'
            : reset
              ? 'Keep your workspace and your reports protected.'
              : 'Your team’s bug inbox is waiting for you.'}
        </p>
        {!configured() && (
          <p className="notice">
            Supabase isn’t connected yet. <Link href="/setup">View setup instructions</Link>.
          </p>
        )}
        <ActionForm
          action={
            mode === 'reset-password'
              ? resetPassword
              : authenticate.bind(null, mode === 'forgot-password' ? 'reset' : mode)
          }
          submit={
            signup
              ? 'Create your account'
              : mode === 'login'
                ? 'Sign in'
                : mode === 'forgot-password'
                  ? 'Send reset link'
                  : 'Update password'
          }
        >
          {signup && (
            <label>
              Full name
              <input className="input" name="name" autoComplete="name" required maxLength={80} />
            </label>
          )}
          {mode !== 'reset-password' && (
            <label>
              Work email
              <input
                className="input"
                type="email"
                name="email"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </label>
          )}
          {mode !== 'forgot-password' && (
            <label>
              Password
              <input
                className="input"
                type="password"
                name="password"
                minLength={10}
                maxLength={128}
                autoComplete={signup || reset ? 'new-password' : 'current-password'}
                required
              />
              <span className="field-hint">At least 10 characters.</span>
            </label>
          )}
        </ActionForm>
        <p className="auth-switch">
          {signup ? (
            <>
              Already have an account? <Link href="/login">Sign in</Link>
            </>
          ) : (
            <>
              New to BugSnap? <Link href="/signup">Create an account</Link>
            </>
          )}
        </p>
        {mode === 'login' && (
          <Link className="small muted" href="/forgot-password">
            Forgot your password?
          </Link>
        )}
      </div>
      <p className="auth-footer">Private by design. Built for the people who fix things.</p>
    </main>
  );
}
