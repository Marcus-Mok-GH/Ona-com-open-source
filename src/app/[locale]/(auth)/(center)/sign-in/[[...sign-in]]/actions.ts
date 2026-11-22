'use server';

import { neonAuth } from '@/libs/NeonAuth';
import { seedUserCreditsIfNew } from '@/libs/Credits';
import { logger } from '@/libs/Logger';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type SignInState = {
  error?: string | null;
  needsVerification?: boolean;
  email?: string;
  reusedCode?: boolean;
} | null;

export type AuthFormState = SignInState;

const DEFAULT_RETURN_TO = '/dashboard';

// Tracks that a verification code was already emailed for an address, so a
// re-visit to the verification page (page refresh, "Back to sign in" and
// resubmit, etc.) reuses the code in the inbox instead of emailing a fresh
// one — Neon Auth invalidates previously issued codes on every send.
const VERIFICATION_SENT_COOKIE = 'ona_vcode_sent';
const VERIFICATION_SENT_TTL_SECONDS = 10 * 60;

type VerificationSentRecord = { email: string; sentAt: number };

async function readVerificationSentRecord(): Promise<VerificationSentRecord | null> {
  const store = await cookies();
  const raw = store.get(VERIFICATION_SENT_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as VerificationSentRecord;
    if (typeof parsed.email !== 'string' || typeof parsed.sentAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function markVerificationCodeSent(email: string): Promise<void> {
  const store = await cookies();
  store.set(
    VERIFICATION_SENT_COOKIE,
    JSON.stringify({ email: email.toLowerCase(), sentAt: Date.now() } satisfies VerificationSentRecord),
    {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: VERIFICATION_SENT_TTL_SECONDS,
      secure: process.env.NODE_ENV === 'production',
    },
  );
}

async function clearVerificationSentRecord(): Promise<void> {
  const store = await cookies();
  store.delete(VERIFICATION_SENT_COOKIE);
}

async function hasFreshVerificationCode(email: string): Promise<boolean> {
  const record = await readVerificationSentRecord();
  if (!record) return false;
  return (
    record.email === email.toLowerCase()
    && Date.now() - record.sentAt < VERIFICATION_SENT_TTL_SECONDS * 1000
  );
}

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
  await markVerificationCodeSent(email);
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

  // A code was already emailed recently (the user re-landed on the sign-in
  // form from the verification step, refreshed the page, etc.). Calling
  // signIn.email would make Neon Auth email a fresh code and invalidate the
  // one still sitting in the inbox — skip straight to verification instead.
  if (await hasFreshVerificationCode(email)) {
    return {
      needsVerification: true,
      email,
      error: null,
      reusedCode: true,
    };
  }

  const { error } = await neonAuth.signIn.email({ email, password });

  if (error) {
    // Unverified credentials: Neon Auth emails a fresh code (send on sign-in
    // is enabled) and rejects the session. Show the verification step.
    // (422 EmailNotConfirmed, or 403 from stricter upstream configs.)
    if (error.status === 422 || error.status === 403) {
      await markVerificationCodeSent(email);
      return {
        needsVerification: true,
        email,
        error: null,
      };
    }
    return { error: error.message || 'Failed to sign in. Try again.' };
  }

  // The account is verified and signed in — a tracked code is no longer
  // relevant, and a stale record would skip verification for a future
  // unverified sign-in on this browser.
  await clearVerificationSentRecord();
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

  await clearVerificationSentRecord();

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
    return;
  }

  // Track the fresh code so re-landing on the verification page keeps it
  // valid instead of triggering yet another send.
  await markVerificationCodeSent(email);
}