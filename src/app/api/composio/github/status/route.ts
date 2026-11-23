import type { NextRequest } from 'next/server';
import { authFailureResponse, getRequestAuth, isAuthFailure } from '@/libs/ApiKeys';
import { getComposioConnectedAccountStatus, hasLinkedGithub, isComposioConfigured } from '@/libs/Composio';
import { getGitHubToken, isGitHubConfigured } from '@/libs/GitHub';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req);
  if (isAuthFailure(auth)) {
    return authFailureResponse(auth);
  }

  const accountId = req.nextUrl.searchParams.get('accountId');
  if (accountId) {
    if (!isComposioConfigured()) {
      return Response.json({ configured: false, status: null });
    }
    try {
      const status = await getComposioConnectedAccountStatus(accountId);
      return Response.json({ configured: true, status });
    } catch (error) {
      return Response.json({ configured: true, status: null, error: (error as Error).message }, { status: 502 });
    }
  }

  if (auth) {
    const linked = await hasLinkedGithub(auth.userId);
    return Response.json({ configured: true, linked });
  }

  // Anonymous visitors keep the pre-existing GitHub cookie behaviour.
  const token = await getGitHubToken();
  const linked = Boolean(isGitHubConfigured() && token);
  return Response.json({ configured: isGitHubConfigured() || isComposioConfigured(), linked });
}
