'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import {
  resendVerificationEmail,
  signInWithEmail,
  signUpWithEmail,
  verifyEmailCode,
  type AuthFormState,
} from './actions';

const inputClasses = [
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-[15px]',
  'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  'transition-all outline-none focus:border-[var(--accent)]',
  'focus:ring-4 focus:ring-[var(--accent)]/15',
].join(' ');

const labelClasses = 'mb-1.5 block text-xs font-medium text-[var(--text-secondary)]';

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
    />
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function VerifyEmailStep({
  email,
  returnTo,
  onBack,
}: {
  email: string;
  returnTo: string;
  onBack: () => void;
}) {
  const [verifyState, submitVerify, verifyPending] = useActionState<AuthFormState, FormData>(
    verifyEmailCode,
    null,
  );
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [resendPending, setResendPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsLeft = resentAt ? Math.max(0, 30 - Math.floor((now - resentAt) / 1000)) : 0;
  const error = verifyPending ? null : verifyState?.error ?? null;
  const maskedEmail = email.replace(/^(.).*(@.*)$/, '$1•••••$2');

  const handleResend = async () => {
    setResendPending(true);
    await resendVerificationEmail(email);
    setResendPending(false);
    setResentAt(Date.now());
  };

  return (
    <div>
      <div className="mb-6 text-center sm:text-left">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] sm:mx-0">
          <MailIcon />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Check your inbox
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          We sent a 6-digit code to <span className="font-medium text-[var(--text-primary)]">{maskedEmail}</span>.
          Enter it below to verify your account.
        </p>
      </div>

      <form action={submitVerify} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <div>
          <label htmlFor="auth-code" className={labelClasses}>
            Verification code
          </label>
          <input
            id="auth-code"
            ref={inputRef}
            name="code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="000000"
            required
            className={`${inputClasses} text-center font-mono text-2xl tracking-[0.5em]`}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400"
          >
            <svg className="mt-0.5 size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={verifyPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--text-primary)] px-4 py-3 text-[15px] font-semibold text-[var(--bg)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {verifyPending && <Spinner />}
          {verifyPending ? 'Verifying…' : 'Verify email'}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          ← Back to sign in
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendPending || secondsLeft > 0}
          className="font-semibold text-[var(--accent)] transition-opacity hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:no-underline"
        >
          {resendPending
            ? 'Sending…'
            : secondsLeft > 0
              ? `Resend code in ${secondsLeft}s`
              : 'Resend code'}
        </button>
      </div>
    </div>
  );
}

export function AuthForm({
  returnTo,
  initialError,
}: {
  returnTo: string;
  initialError?: string | null;
}) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [showPassword, setShowPassword] = useState(false);
  const [signInState, submitSignIn, signInPending] = useActionState<AuthFormState, FormData>(
    signInWithEmail,
    null,
  );
  const [signUpState, submitSignUp, signUpPending] = useActionState<AuthFormState, FormData>(
    signUpWithEmail,
    null,
  );

  const state = mode === 'sign-in' ? signInState : signUpState;
  const pending = mode === 'sign-in' ? signInPending : signUpPending;
  const error = pending ? null : state?.error ?? initialError ?? null;

  if (state?.needsVerification && state.email) {
    return (
      <VerifyEmailStep
        email={state.email}
        returnTo={returnTo}
        onBack={() => setMode('sign-in')}
      />
    );
  }

  const switchMode = (next: 'sign-in' | 'sign-up') => {
    if (next !== mode) {
      setMode(next);
      setShowPassword(false);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          {mode === 'sign-in'
            ? 'Sign in to continue to your workspace.'
            : 'Start delegating background work in minutes.'}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Authentication mode"
        className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-[var(--bg-3)] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'sign-in'}
          onClick={() => switchMode('sign-in')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            mode === 'sign-in'
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'sign-up'}
          onClick={() => switchMode('sign-up')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            mode === 'sign-up'
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Create account
        </button>
      </div>

      <form action={mode === 'sign-in' ? submitSignIn : submitSignUp} className="space-y-4">
        <input type="hidden" name="returnTo" value={returnTo} />
        {mode === 'sign-up' && (
          <div>
            <label htmlFor="auth-name" className={labelClasses}>
              Name
            </label>
            <input
              id="auth-name"
              name="name"
              placeholder="Ada Lovelace"
              autoComplete="name"
              className={inputClasses}
            />
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className={labelClasses}>
            Email
          </label>
          <input
            id="auth-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoFocus
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="auth-password" className={labelClasses}>
            Password
          </label>
          <div className="relative">
            <input
              id="auth-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'sign-up' ? 'At least 8 characters' : '••••••••'}
              required
              minLength={8}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              className={`${inputClasses} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {mode === 'sign-up' && (
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              We&apos;ll email you a 6-digit code to verify your address.
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400"
          >
            <svg className="mt-0.5 size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--text-primary)] px-4 py-3 text-[15px] font-semibold text-[var(--bg)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending && <Spinner />}
          {pending
            ? 'Working…'
            : mode === 'sign-in'
              ? 'Sign in'
              : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        {mode === 'sign-in' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          onClick={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          className="font-semibold text-[var(--accent)] hover:underline"
        >
          {mode === 'sign-in' ? 'Create one' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}