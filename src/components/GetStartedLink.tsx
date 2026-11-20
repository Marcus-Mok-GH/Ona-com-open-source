'use client';

import type { ReactNode } from 'react';

type GetStartedLinkProps = {
  children: ReactNode;
  className?: string;
  locale: string;
};

function getReturnTo(locale: string) {
  return locale === 'en' ? '/dashboard' : `/${locale}/dashboard`;
}

function getSignInPath(locale: string) {
  return locale === 'en' ? '/sign-in' : `/${locale}/sign-in`;
}

export function GetStartedLink({ children, className, locale }: GetStartedLinkProps) {
  const returnTo = getReturnTo(locale);
  const signInHref = `${getSignInPath(locale)}?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <a
      href={signInHref}
      target="_top"
      rel="noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}