import { getGitHubToken } from '@/libs/GitHub';

const COMPOSIO_BASE_URL = process.env.COMPOSIO_BASE_URL?.replace(/\/$/, '') || 'https://backend.composio.dev';

type ComposioAuthConfig = {
  id?: string;
  is_disabled?: boolean;
  toolkit?: { slug?: string } | string;
};

type ComposioConnectedAccount = {
  id?: string;
  status?: string;
};

export type ComposioAuthLink = {
  redirectUrl: string;
  connectedAccountId: string | null;
  expiresAt: string | null;
};

export function isComposioConfigured() {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

function authConfigToolkitSlug(config: ComposioAuthConfig): string | null {
  if (typeof config.toolkit === 'string') {
    return config.toolkit;
  }
  return config.toolkit?.slug ?? null;
}

export function pickGithubAuthConfig(items: ComposioAuthConfig[]): string | null {
  const found = items.find(config =>
    config.id
    && !config.is_disabled
    && authConfigToolkitSlug(config)?.toLowerCase() === 'github',
  );
  return found?.id ?? null;
}

export function mapAuthLinkResponse(data: unknown): ComposioAuthLink | null {
  const parsed = data as { redirect_url?: string; connected_account_id?: string; expires_at?: string } | null;
  if (!parsed?.redirect_url) {
    return null;
  }
  return {
    redirectUrl: parsed.redirect_url,
    connectedAccountId: parsed.connected_account_id ?? null,
    expiresAt: parsed.expires_at ?? null,
  };
}

async function composioFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error('COMPOSIO_API_KEY is not configured');
  }

  const res = await fetch(`${COMPOSIO_BASE_URL}${path}`, {
    ...init,
    headers: {
      'x-api-key': apiKey,
      'Accept': 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = (data as { message?: string; error?: string } | null)?.message
      ?? (data as { error?: string } | null)?.error
      ?? text.slice(0, 200)
      ?? res.statusText;
    throw new Error(`Composio API error ${res.status}: ${message}`);
  }

  return data as T;
}

let cachedGithubAuthConfigId: string | null = null;
let cacheResolved = false;

export function resetComposioCacheForTests() {
  cachedGithubAuthConfigId = null;
  cacheResolved = false;
}

export async function getGithubAuthConfigId(): Promise<string> {
  const override = process.env.COMPOSIO_GITHUB_AUTH_CONFIG_ID;
  if (override) {
    return override;
  }

  if (cacheResolved && cachedGithubAuthConfigId) {
    return cachedGithubAuthConfigId;
  }

  const list = await composioFetch<unknown>('/api/v3.1/auth_configs');
  const existing = pickGithubAuthConfig(unwrapList<ComposioAuthConfig>(list));
  if (existing) {
    cachedGithubAuthConfigId = existing;
    cacheResolved = true;
    return existing;
  }

  const created = await composioFetch<{ id?: string }>('/api/v3.1/auth_configs', {
    method: 'POST',
    body: JSON.stringify({ toolkit: { slug: 'github' } }),
  });
  if (!created?.id) {
    throw new Error('Composio did not return a GitHub auth config id');
  }

  cachedGithubAuthConfigId = created.id;
  cacheResolved = true;
  return created.id;
}

export async function createGithubAuthLink(userId: string, callbackUrl: string): Promise<ComposioAuthLink> {
  const authConfigId = await getGithubAuthConfigId();
  const data = await composioFetch<unknown>('/api/v3/connected_accounts/link', {
    method: 'POST',
    body: JSON.stringify({
      auth_config_id: authConfigId,
      user_id: userId,
      callback_url: callbackUrl,
    }),
  });
  const link = mapAuthLinkResponse(data);
  if (!link) {
    throw new Error('Composio did not return an auth link');
  }
  return link;
}

export async function getComposioConnectedAccountStatus(accountId: string): Promise<string | null> {
  const data = await composioFetch<ComposioConnectedAccount>(`/api/v3.1/connected_accounts/${encodeURIComponent(accountId)}`);
  return data?.status ?? null;
}

export async function isGithubLinkedViaComposio(userId: string): Promise<boolean> {
  const query = `user_ids=${encodeURIComponent(userId)}&toolkit_slugs=github&statuses=ACTIVE`;
  const data = await composioFetch<unknown>(`/api/v3.1/connected_accounts?${query}`);
  return unwrapList<ComposioConnectedAccount>(data).some(account => account.status === 'ACTIVE');
}

// A user counts as linked when they hold a legacy GitHub token (device flow)
// or an active Composio GitHub connection. Used to enforce the new-chat gate.
export async function hasLinkedGithub(userId: string): Promise<boolean> {
  try {
    const token = await getGitHubToken(userId);
    if (token) {
      return true;
    }
  } catch {}

  if (!isComposioConfigured()) {
    return false;
  }

  try {
    return await isGithubLinkedViaComposio(userId);
  } catch {
    return false;
  }
}
