import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected private routes requiring authenticated session
const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/my-reservations'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('reshub_session')?.value;

  const isProtectedRoute = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));
  const isLoginPage = pathname === '/login';

  // 1. Private route protection: No exceptions allowed
  if (isProtectedRoute && !sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/my-reservations/:path*',
    '/login',
  ],
};
