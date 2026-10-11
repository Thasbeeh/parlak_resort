import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const secret = new TextEncoder().encode(
    process.env.ADMIN_JWT_SECRET || 'super-secret-jwt-key-change-in-production'
  );

  // 1. Protect /api/admin routes -> Return 401 JSON on unauthenticated / invalid requests
  if (pathname.startsWith('/api/admin')) {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await jwtVerify(token, secret);
      const res = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      res.headers.set('x-pathname', pathname);
      return res;
    } catch {
      const errorRes = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      errorRes.cookies.delete('admin_token');
      return errorRes;
    }
  }

  // 2. Protect /admin routes, but allow access to /admin/login
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      // Verify the JWT token
      await jwtVerify(token, secret);
      const res = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      res.headers.set('x-pathname', pathname);
      return res;
    } catch {
      // Token is invalid or expired -> clear cookie and redirect
      const redirectRes = NextResponse.redirect(new URL('/admin/login', request.url));
      redirectRes.cookies.delete('admin_token');
      return redirectRes;
    }
  }

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  res.headers.set('x-pathname', pathname);
  return res;
}

// Config ensures middleware runs on /admin routes and /api/admin routes
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
