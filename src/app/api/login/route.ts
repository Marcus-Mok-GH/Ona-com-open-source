import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getSignInPath(returnTo: string) {
  const firstPathSegment = returnTo.split('/').filter(Boolean)[0];
  return firstPathSegment === 'en' || firstPathSegment?.match(/^[a-z]{2}(-[A-Z]{2})?$/) ? `/${firstPathSegment}/sign-in` : '/sign-in';
}

// Deprecated convenience route: redirects to the sign-in page.
// Sign-in now happens in-app via Neon Auth (email + password).
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('returnTo') || '';
  const returnTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
  const target = new URL(getSignInPath(returnTo), request.nextUrl.origin);
  target.searchParams.set('returnTo', returnTo);
  return NextResponse.redirect(target);
}
