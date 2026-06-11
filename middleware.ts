import { NextResponse, type NextRequest } from 'next/server';

const PAUSED_PATHS = ['/admin', '/forgot-password', '/kamper', '/varslinger', '/onboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PAUSED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/forgot-password', '/kamper/:path*', '/varslinger/:path*', '/onboard/:path*'],
};