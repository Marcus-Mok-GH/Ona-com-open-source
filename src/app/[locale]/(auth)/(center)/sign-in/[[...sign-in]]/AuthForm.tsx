'use client';

import { useActionState, useState } from 'react';
import { signInWithEmail, signUpWithEmail, type AuthFormState } from './actions';

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '8px',
  border: '1px solid #d9d5cd',
  fontSize: '15px',
  boxSizing: 'border-box',
  marginBottom: '12px',
} as const;

const buttonStyle = {
  width: '100%',
  padding: '12px 24px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#18182a',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
} as const;

export function AuthForm({ returnTo }: { returnTo: string }) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
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

  return (
    <div style={{ maxWidth: '360px', margin: '0 auto', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          justifyContent: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => setMode('sign-in')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #d9d5cd',
            background: mode === 'sign-in' ? '#18182a' : 'transparent',
            color: mode === 'sign-in' ? '#fff' : '#18182a',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('sign-up')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #d9d5cd',
            background: mode === 'sign-up' ? '#18182a' : 'transparent',
            color: mode === 'sign-up' ? '#fff' : '#18182a',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Create account
        </button>
      </div>

      <form action={mode === 'sign-in' ? submitSignIn : submitSignUp}>
        <input type="hidden" name="returnTo" value={returnTo} />
        {mode === 'sign-up' && (
          <input name="name" placeholder="Name" style={inputStyle} autoComplete="name" />
        )}
        <input
          name="email"
          type="email"
          placeholder="Email address"
          required
          style={inputStyle}
          autoComplete="email"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={8}
          style={inputStyle}
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
        />
        {state?.error && (
          <div
            role="alert"
            style={{
              borderRadius: '8px',
              border: '1px solid #f0b4b4',
              backgroundColor: '#fff5f5',
              color: '#8a1f1f',
              padding: '12px 14px',
              fontSize: '14px',
              marginBottom: '12px',
            }}
          >
            {state.error}
          </div>
        )}
        <button type="submit" disabled={pending} style={buttonStyle}>
          {pending
            ? 'Working…'
            : mode === 'sign-in'
              ? 'Sign in'
              : 'Create account'}
        </button>
      </form>
    </div>
  );
}