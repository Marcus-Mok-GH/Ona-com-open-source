'use client';

import { useSyncExternalStore } from 'react';
import { getSafeBrowserReturnPath, isMobileBrowser, navigateTopLevel } from '@/utils/browserCompat';
import { AppConfig } from '@/utils/AppConfig';

export type SessionUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

type AuthSnapshot = {
  user: SessionUser | null;
  isLoading: boolean;
};

const UNAUTHORIZED_SNAPSHOT: AuthSnapshot = { user: null, isLoading: false };
const LOADING_SNAPSHOT: AuthSnapshot = { user: null, isLoading: true };
let snapshot: AuthSnapshot = LOADING_SNAPSHOT;
const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;
let initialized = false;

function emit(next: AuthSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { credentials: 'include', ...init });
}

export async function refreshAuth(): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = apiFetch('/api/auth/user')
    .then((res) => (res.ok ? res.json() : null))
    .then((data: SessionUser | null) => {
      emit({ user: data, isLoading: false });
    })
    .catch(() => {
      emit(UNAUTHORIZED_SNAPSHOT);
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (!initialized) {
    initialized = true;
    void refreshAuth();

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', refreshAuth);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void refreshAuth();
      });
    }
  }

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AuthSnapshot {
  return snapshot;
}

function getServerSnapshot(): AuthSnapshot {
  return LOADING_SNAPSHOT;
}

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: !!state.user,
    refresh: refreshAuth,
  };
}

function getLocaleFromPath(path: string) {
  const firstPathSegment = path.split('/').filter(Boolean)[0];
  return AppConfig.locales.includes(firstPathSegment || '') ? firstPathSegment! : AppConfig.defaultLocale;
}

function getLocalizedDashboardPath(locale: string) {
  return locale === AppConfig.defaultLocale ? '/dashboard' : `/${locale}/dashboard`;
}

function getLocalizedSignInPath(locale: string) {
  return locale === AppConfig.defaultLocale ? '/sign-in' : `/${locale}/sign-in`;
}

export function signIn(returnTo?: string) {
  const locale = getLocaleFromPath(returnTo || window.location.pathname);
  const safeReturnTo = getSafeBrowserReturnPath(returnTo, getLocalizedDashboardPath(locale));
  const path = isMobileBrowser() ? getLocalizedSignInPath(locale) : '/api/login';
  const url = new URL(path, window.location.origin);

  url.searchParams.set('returnTo', safeReturnTo);
  navigateTopLevel(url.toString());
}

export function signOut() {
  const locale = getLocaleFromPath(window.location.pathname);
  const homePath = locale === AppConfig.defaultLocale ? '/' : `/${locale}`;
  emit(UNAUTHORIZED_SNAPSHOT);
  apiFetch('/api/auth/sign-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
    .catch(() => undefined)
    .finally(() => {
      navigateTopLevel(homePath);
    });
}
