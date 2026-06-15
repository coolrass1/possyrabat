import { NextRequest, NextResponse } from 'next/server';

const publicRoutes = ['/login', '/reset-password', '/api/auth/login', '/api/auth/logout'];

export function middleware(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // If no session and trying to access protected route, redirect to login
  if (!sessionId && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
