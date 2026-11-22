'use server';

import { neonAuth } from '@/libs/NeonAuth';
import { seedUserCreditsIfNew } from '@/libs/Credits';
import { logger } from '@/libs/Logger';
import { redirect } from 'next/navigation';

export type SignInState = {
  error?: string | null;
  needsVerification?: boolean;
  email?: string;
} | null;

export type AuthFormState = SignInState;

const DEFAULT_RETURN_TO = '/dashboard';

// Accept only same-site, non-API relative paths as post-sign-in destinations.
function safeReturnPath(raw: FormDataEntryValue | null): string {
  const value = typeof raw === 'string' ? raw : '';
  if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/api/')) {
    return value;
  }
  return DEFAULT_RETURN_TO;
}

async function seedCreditsForCurrentUser(): Promise<void> {
  const { data: session } = await neonAuth.getSession();
  const userId = session?.user?.id;
  if (userId) {
    await seedUserCreditsIfNew(userId);
  }
}

export async function signUpWithEmail(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const name = String(formData.get('name') || '').trim();

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const { error } = await neonAuth.signUp.email({ email, password, name: name.length > 0 ? name : email.replace(/@.*$/, '') });

  if (error) {
    if (error.status === 422 || /already/i.test(error.message ?? '')) {
      return {
        error: 'An account with this email already exists. Try signing in instead.',
      };
    }
    return { error: error.message || 'Failed to create the account. Try again.' };
  }

  // Neon Auth is configured with required email verification: the sign-up
  // response carries no session and a 6-digit code has been emailed.
  return {
    needsVerification: true,
    email,
    error: null,
  };
}

export async function signInWithEmail(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const { error } = await neonAuth.signIn.email({ email, password });

  if (error) {
    // Unverified credentials: Neon Auth emails a fresh code (send on sign-in
    // is enabled) and rejects the session. Show the verification step.
    // (422 EmailNotConfirmed, or 403 from stricter upstream configs.)
    if (error.status === 422 || error.status === 403) {
      return {
        needsVerification: true,
        email,
        error: null,
      };
    }
    return { error: error.message || 'Failed to sign in. Try again.' };
  }

  await seedCreditsForCurrentUser();

  redirect(safeReturnPath(formData.get('returnTo')));
}

// Called from the verification step after sign-up/sign-in returns
// `needsVerification`. On success Neon Auth starts the session
// (auto-sign-in-after-verification is enabled), so this action redirects.
export async function verifyEmailCode(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') || '').trim();
  const code = String(formData.get('code') || '').trim();
  const returnTo = safeReturnPath(formData.get('returnTo'));

  if (!email || !code) {
    return { error: 'Enter the 6-digit code from your email.' };
  }

  const { error } = await neonAuth.emailOtp.verifyEmail({ email, otp: code });

  if (error) {
    if (error.status === 400 || error.status === 401) {
      return {
        error: 'That code is invalid or has expired. Request a new one.',
      };
    }
    return { error: error.message || 'Verification failed. Try again.' };
  }

  try {
    await seedCreditsForCurrentUser();
  } catch (seedError) {
    logger.warn({ seedError }, 'Credit seeding after verification failed');
  }

  redirect(returnTo);
}

// Fire-and-forget resend of the verification code.
export async function resendVerificationEmail(email: string): Promise<void> {
  const { error } = await neonAuth.emailOtp.sendVerificationOtp({
    email,
    type: 'email-verification',
  });

  if (error) {
    logger.warn({ err: error }, 'Verification code resend failed');
  }
}