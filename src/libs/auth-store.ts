export type SessionUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

export type AuthSnapshot = {
  user: SessionUser | null;
  isLoading: boolean;
};

export const UNAUTHORIZED_SNAPSHOT: AuthSnapshot = { user: null, isLoading: false };
export const LOADING_SNAPSHOT: AuthSnapshot = { user: null, isLoading: true };

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export function createAuthStore(fetcher: Fetcher) {
  let snapshot: AuthSnapshot = LOADING_SNAPSHOT;
  const listeners = new Set<() => void>();
  let inFlight: Promise<void> | null = null;
  let generation = 0;
  let signingOut = false;

  function emit(next: AuthSnapshot) {
    snapshot = next;
    for (const listener of listeners) listener();
  }

  function refresh(): Promise<void> {
    if (signingOut) return Promise.resolve();
    if (inFlight) return inFlight;

    const requestGeneration = generation;
    inFlight = (async () => {
      try {
        const res = await fetcher('/api/auth/user');

        if (res.status === 401) {
          if (requestGeneration === generation && !signingOut) emit(UNAUTHORIZED_SNAPSHOT);
          return;
        }

        // A server or network failure is not proof of sign-out: keep the last
        // known user so a transient error doesn't flash the signed-out UI.
        if (!res.ok) return;

        const data: SessionUser | null = await res.json();
        if (requestGeneration === generation && !signingOut) {
          emit({ user: data, isLoading: false });
        }
      } catch {
        // Same as above: retain the cached user and let revalidation retry.
      } finally {
        // Always finish loading, even when the request failed or returned 401.
        if (requestGeneration === generation && !signingOut && snapshot.isLoading) {
          emit({ user: snapshot.user, isLoading: false });
        }
      }
    })().finally(() => {
      inFlight = null;
    });

    return inFlight;
  }

  function beginSignOut() {
    signingOut = true;
    generation += 1;
    emit(UNAUTHORIZED_SNAPSHOT);
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getSnapshot(): AuthSnapshot {
    return snapshot;
  }

  return { refresh, beginSignOut, subscribe, getSnapshot };
}
