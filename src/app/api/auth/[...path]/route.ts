import { neonAuth, neonAuthEnabled } from '@/libs/NeonAuth';

const handlers = neonAuth.handler();

function notConfigured() {
  return Response.json(
    { error: 'Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.' },
    { status: 503 },
  );
}

export const GET = (...args: Parameters<typeof handlers.GET>) =>
  neonAuthEnabled ? handlers.GET(...args) : notConfigured();

export const POST = (...args: Parameters<typeof handlers.POST>) =>
  neonAuthEnabled ? handlers.POST(...args) : notConfigured();

export const PUT = (...args: Parameters<typeof handlers.PUT>) =>
  neonAuthEnabled ? handlers.PUT(...args) : notConfigured();

export const PATCH = (...args: Parameters<typeof handlers.PATCH>) =>
  neonAuthEnabled ? handlers.PATCH(...args) : notConfigured();

export const DELETE = (...args: Parameters<typeof handlers.DELETE>) =>
  neonAuthEnabled ? handlers.DELETE(...args) : notConfigured();
