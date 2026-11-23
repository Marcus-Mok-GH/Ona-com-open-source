import { afterEach, describe, expect, it, vi } from 'vitest';

import { getGitHubToken } from '@/libs/GitHub';
import {
  createGithubAuthLink,
  getGithubAuthConfigId,
  hasLinkedGithub,
  isGithubLinkedViaComposio,
  mapAuthLinkResponse,
  pickGithubAuthConfig,
  resetComposioCacheForTests,
  unwrapList,
} from './Composio';

vi.mock('@/libs/GitHub', () => ({
  getGitHubToken: vi.fn().mockResolvedValue(undefined),
}));

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  resetComposioCacheForTests();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  delete process.env.COMPOSIO_API_KEY;
  delete process.env.COMPOSIO_GITHUB_AUTH_CONFIG_ID;
});

describe('unwrapList', () => {
  it('passes through arrays and unwraps { items } envelopes', () => {
    expect(unwrapList([1, 2])).toEqual([1, 2]);
    expect(unwrapList({ items: ['a'] })).toEqual(['a']);
    expect(unwrapList({ data: [] })).toEqual([]);
    expect(unwrapList(null)).toEqual([]);
    expect(unwrapList('nope')).toEqual([]);
  });
});

describe('pickGithubAuthConfig', () => {
  it('selects the enabled github config', () => {
    expect(pickGithubAuthConfig([
      { id: 'ac_slack', toolkit: { slug: 'slack' } },
      { id: 'ac_github', toolkit: { slug: 'github' } },
    ])).toBe('ac_github');
    expect(pickGithubAuthConfig([
      { id: 'ac_gh', toolkit: 'github' },
    ])).toBe('ac_gh');
  });

  it('ignores disabled configs and non-github toolkits', () => {
    expect(pickGithubAuthConfig([
      { id: 'ac_github', toolkit: { slug: 'github' }, is_disabled: true },
      { id: 'ac_other', toolkit: { slug: 'slack' } },
    ])).toBeNull();
    expect(pickGithubAuthConfig([])).toBeNull();
  });
});

describe('mapAuthLinkResponse', () => {
  it('maps the connect-link payload', () => {
    expect(mapAuthLinkResponse({
      link_token: 'tok',
      redirect_url: 'https://connect.example/x',
      connected_account_id: 'ca_1',
      expires_at: '2030-01-01T00:00:00Z',
    })).toEqual({
      redirectUrl: 'https://connect.example/x',
      connectedAccountId: 'ca_1',
      expiresAt: '2030-01-01T00:00:00Z',
    });
  });

  it('returns null when no redirect url is present', () => {
    expect(mapAuthLinkResponse({})).toBeNull();
    expect(mapAuthLinkResponse(null)).toBeNull();
  });
});

describe('API wrappers', () => {
  it('resolves the github auth config id from the override env var without a network call', async () => {
    process.env.COMPOSIO_API_KEY = 'test-key';
    process.env.COMPOSIO_GITHUB_AUTH_CONFIG_ID = 'ac_override';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(getGithubAuthConfigId()).resolves.toBe('ac_override');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates an auth link against the connect-link endpoint', async () => {
    process.env.COMPOSIO_API_KEY = 'test-key';
    process.env.COMPOSIO_GITHUB_AUTH_CONFIG_ID = 'ac_1';
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {
      link_token: 'tok',
      redirect_url: 'https://connect.example/x',
      connected_account_id: 'ca_1',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const link = await createGithubAuthLink('user-1', 'https://app.example/callback');

    expect(link).toEqual({
      redirectUrl: 'https://connect.example/x',
      connectedAccountId: 'ca_1',
      expiresAt: null,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://backend.composio.dev/api/v3/connected_accounts/link');

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;

    expect(JSON.parse(String(init.body))).toEqual({
      auth_config_id: 'ac_1',
      user_id: 'user-1',
      callback_url: 'https://app.example/callback',
    });
  });

  it('reports linked when an ACTIVE github connected account exists', async () => {
    process.env.COMPOSIO_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {
      items: [{ id: 'ca_1', status: 'ACTIVE' }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(isGithubLinkedViaComposio('user-1')).resolves.toBe(true);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('user_ids=user-1&toolkit_slugs=github&statuses=ACTIVE');
  });

  it('reports not linked when no active accounts are returned', async () => {
    process.env.COMPOSIO_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, {
      items: [{ id: 'ca_1', status: 'INITIALIZING' }],
    })));

    await expect(isGithubLinkedViaComposio('user-1')).resolves.toBe(false);
  });

  it('counts a legacy GitHub token as linked and skips the Composio lookup', async () => {
    process.env.COMPOSIO_API_KEY = 'test-key';
    vi.mocked(getGitHubToken).mockResolvedValueOnce('legacy-token');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(hasLinkedGithub('user-1')).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to Composio when no legacy token exists', async () => {
    process.env.COMPOSIO_API_KEY = 'test-key';
    vi.mocked(getGitHubToken).mockResolvedValueOnce(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, {
      items: [{ id: 'ca_1', status: 'ACTIVE' }],
    })));

    await expect(hasLinkedGithub('user-1')).resolves.toBe(true);
  });
});
