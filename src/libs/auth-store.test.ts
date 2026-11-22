import { describe, expect, it, vi } from 'vitest';
import { createAuthStore, UNAUTHORIZED_SNAPSHOT } from './auth-store';

const user = {
  id: 'user-1',
  email: 'user@example.com',
  firstName: 'Test',
  lastName: 'User',
  profileImageUrl: null,
};

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('createAuthStore', () => {
  it('keeps the cached user and finishes loading on a transient failure', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, user))
      .mockResolvedValueOnce(jsonResponse(500));
    const store = createAuthStore(fetcher);

    await store.refresh();
    expect(store.getSnapshot()).toEqual({ user, isLoading: false });

    await store.refresh();
    expect(store.getSnapshot()).toEqual({ user, isLoading: false });
  });

  it('keeps the cached user when the network request rejects', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, user))
      .mockRejectedValueOnce(new Error('offline'));
    const store = createAuthStore(fetcher);

    await store.refresh();
    await store.refresh();

    expect(store.getSnapshot()).toEqual({ user, isLoading: false });
  });

  it('clears the cached user only for a confirmed 401', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, user))
      .mockResolvedValueOnce(jsonResponse(401));
    const store = createAuthStore(fetcher);

    await store.refresh();
    await store.refresh();

    expect(store.getSnapshot()).toEqual(UNAUTHORIZED_SNAPSHOT);
  });

  it('ignores an in-flight refresh that resolves after sign-out', async () => {
    let resolveResponse!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    }));
    const store = createAuthStore(fetcher);

    const pending = store.refresh();
    store.beginSignOut();
    resolveResponse(jsonResponse(200, user));
    await pending;
    await store.refresh();

    expect(store.getSnapshot()).toEqual(UNAUTHORIZED_SNAPSHOT);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent refreshes', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(200, user));
    const store = createAuthStore(fetcher);

    await Promise.all([store.refresh(), store.refresh(), store.refresh()]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({ user, isLoading: false });
  });
});
