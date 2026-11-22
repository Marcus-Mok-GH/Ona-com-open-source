'use client';

import Link from 'next/link';
import { GetStartedLink } from '@/components/GetStartedLink';
import { useAuth } from '@/libs/auth-client';
import { AppConfig } from '@/utils/AppConfig';

type Props = {
  locale: string;
};

function localizedHref(path: string, locale: string) {
  return locale === AppConfig.defaultLocale ? path : `/${locale}${path}`;
}

export function SessionHeaderActions({ locale }: Props) {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && isAuthenticated) {
    return (
      <>
        <Link
          href={localizedHref('/dashboard', locale)}
          className="rounded-lg px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          Dashboard
        </Link>
        <Link
          href={localizedHref('/app', locale)}
          className="rounded-lg bg-[var(--text-primary)] px-3 py-1.5 text-[var(--bg)] transition-opacity hover:opacity-80"
        >
          Open App
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        href={localizedHref('/dashboard', locale)}
        className="rounded-lg px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        Sign In
      </Link>
      <GetStartedLink
        className="rounded-lg bg-[var(--text-primary)] px-3 py-1.5 text-[var(--bg)] transition-opacity hover:opacity-80"
        locale={locale}
      >
        Get Started
      </GetStartedLink>
    </>
  );
}
