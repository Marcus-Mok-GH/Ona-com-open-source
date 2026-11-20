import { createNeonAuth } from '@neon/auth/next/server';

export const neonAuthEnabled = Boolean(process.env.NEON_AUTH_BASE_URL);

export const neonAuth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? 'https://neon-auth-not-configured.invalid',
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET ?? process.env.SESSION_SECRET ?? 'insecure-dev-only-fallback-secret-32ch',
  },
  logLevel: 'warn',
});

export type SessionUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

type NeonAuthSession = Awaited<ReturnType<typeof neonAuth.getSession>>;

function mapSessionUser(
  user: NonNullable<NonNullable<NeonAuthSession['data']>['user']> | undefined,
): SessionUser | undefined {
  if (!user) return undefined;

  const fullName = user.name ?? '';
  const [firstName, ...rest] = fullName.split(' ');
  const profileImageUrl = 'image' in user ? (user as { image?: string | null }).image ?? null : null;

  return {
    id: user.id,
    email: user.email ?? null,
    firstName: firstName || null,
    lastName: rest.join(' ') || null,
    profileImageUrl,
  };
}

export async function getSession() {
  if (!neonAuthEnabled) {
    return { user: undefined };
  }
  const { data } = await neonAuth.getSession();
  return { user: mapSessionUser(data?.user) };
}

const DEFAULT_RETURN_TO = '/dashboard';

export function getSafeReturnPath(returnTo: string | null | undefined, baseUrl: string): string {
  if (!returnTo) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const base = new URL(baseUrl);
    const parsed = new URL(returnTo, base);

    if (parsed.origin !== base.origin || !parsed.pathname.startsWith('/')) {
      return DEFAULT_RETURN_TO;
    }

    if (parsed.pathname.startsWith('/api/')) {
      return DEFAULT_RETURN_TO;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}
