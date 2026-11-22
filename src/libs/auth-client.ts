'use client';

import { useSyncExternalStore } from 'react';
import { getSafeBrowserReturnPath, isMobileBrowser, navigateTopLevel } from '@/utils/browserCompat';
import { AppConfig } from '@/utils/AppConfig';
import { createAuthStore, LOADING_SNAPSHOT } from './auth-store';

export type { SessionUser } from './auth-store';

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { credentials: 'include', ...init });
}

const authStore = createAuthStore(apiFetch);

export function refreshAuth(): Promise<void> {
  return authStore.refresh();
}

let initialized = false;

function subscribe(listener: () => void): () => void {
  const unsubscribe = authStore.subscribe(listener);

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

  return unsubscribe;
}

function getSnapshot() {
  return authStore.getSnapshot();
}

function getServerSnapshot() {
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
  authStore.beginSignOut();
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
