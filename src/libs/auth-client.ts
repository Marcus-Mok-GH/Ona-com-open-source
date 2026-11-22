'use client';

import { useEffect, useState } from 'react';
import { getSafeBrowserReturnPath, isMobileBrowser, navigateTopLevel } from '@/utils/browserCompat';
import { AppConfig } from '@/utils/AppConfig';

export type SessionUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/user', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then((data: SessionUser | null) => {
        setUser(data);
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
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
  fetch('/api/auth/sign-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
    .catch(() => undefined)
    .finally(() => {
      navigateTopLevel(homePath);
    });
}