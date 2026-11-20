import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { routing } from './libs/I18nRouting';
import { isShuttingDown, incrementActiveRequests, getShutdownStatus } from './libs/GracefulShutdown';

const handleI18nRouting = createIntlMiddleware(routing);
const isHealthEndpoint = (pathname: string) => pathname === '/api/healthz' || pathname === '/api/readiness';

/**
 * With `localePrefix: 'as-needed'`, next-intl serves `/dashboard` by rewriting
 * the request to `/en/dashboard`. Next.js runs middleware again on that
 * rewritten URL, where next-intl redirects `/en/dashboard` back to `/dashboard`
 * — an endless 307 loop that breaks every unprefixed path.
 *
 * next-intl tags the rewrite with `x-next-intl-locale`, so when that header is
 * present and the path is already localised we let the request through.
 */
function isLocaleRewrite(req: NextRequest) {
  if (!req.headers.has('x-next-intl-locale')) {
    return false;
  }

  const [firstSegment] = req.nextUrl.pathname.split('/').filter(Boolean);

  return firstSegment !== undefined && (routing.locales as readonly string[]).includes(firstSegment);
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (isShuttingDown() && !isHealthEndpoint(pathname)) {
      return new Response(
        JSON.stringify({ error: 'Server is shutting down', status: getShutdownStatus() }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isHealthEndpoint(pathname)) {
      incrementActiveRequests();
    }

    return;
  }

  if (isLocaleRewrite(req)) {
    return NextResponse.next();
  }

  return handleI18nRouting(req);
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
