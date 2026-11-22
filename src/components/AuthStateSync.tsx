'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { refreshAuth } from '@/libs/auth-client';

const AUTH_PAGE_PATTERN = /\/(?:sign-in|sign-up)(?:\/|$)/;

export function AuthStateSync() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    const previous = previousPath.current;
    previousPath.current = pathname;

    // Server actions redirect from sign-in/sign-up without remounting the
    // client store, so revalidate once the destination route renders.
    if (previous !== pathname && AUTH_PAGE_PATTERN.test(previous)) {
      void refreshAuth();
    }
  }, [pathname]);

  return null;
}
