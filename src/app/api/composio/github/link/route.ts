import type { NextRequest } from 'next/server';
import { authFailureResponse, getRequestAuth, isAuthFailure } from '@/libs/ApiKeys';
import { createGithubAuthLink, isComposioConfigured } from '@/libs/Composio';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = await getRequestAuth(req);
  if (isAuthFailure(auth)) {
    return authFailureResponse(auth);
  }
  if (!auth || auth.source !== 'session') {
    return Response.json(
      { error: 'sign_in_required', message: 'Sign in to link your GitHub account.' },
      { status: 401 },
    );
  }
  if (!isComposioConfigured()) {
    return Response.json(
      { error: 'composio_not_configured', message: 'GitHub linking via Composio is not configured.' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({})) as { callbackUrl?: string };
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const callbackUrl = body.callbackUrl || `${origin}/task?composio_connected=1`;

  try {
    const link = await createGithubAuthLink(auth.userId, callbackUrl);
    return Response.json(link);
  } catch (error) {
    return Response.json(
      { error: 'composio_error', message: (error as Error).message },
      { status: 502 },
    );
  }
}
