'use server';

import { neonAuth } from '@/libs/NeonAuth';
import { seedUserCreditsIfNew } from '@/libs/Credits';
import { redirect } from 'next/navigation';

export type SignInState = { error?: string } | null;

const DEFAULT_RETURN_TO = '/dashboard';

// Accept only same-site, non-API relative paths as post-sign-in destinations.
function safeReturnPath(raw: FormDataEntryValue | null): string {
  const value = typeof raw === 'string' ? raw : '';
  if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/api/')) {
    return value;
  }
  return DEFAULT_RETURN_TO;
}

export async function signUpWithEmail(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const { error } = await neonAuth.signUp.email({
    email,
    name: name || email.split('@')[0] || 'ONA user',
    password,
  });

  if (error) {
    return { error: error.message || 'Failed to create an account. Try again.' };
  }

  // Seed a starting credit balance on first sign-up so new users don't hit
  // the 402 gate on /api/chat. Idempotent — no-op for returning users.
  const { data: session } = await neonAuth.getSession();
  const userId = session?.user?.id;
  if (userId) {
    await seedUserCreditsIfNew(userId);
  }

  redirect(safeReturnPath(formData.get('returnTo')));
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
    return { error: error.message || 'Failed to sign in. Try again.' };
  }

  const { data: session } = await neonAuth.getSession();
  const userId = session?.user?.id;
  if (userId) {
    await seedUserCreditsIfNew(userId);
  }

  redirect(safeReturnPath(formData.get('returnTo')));
}
export type AuthFormState = SignInState;
