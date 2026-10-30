import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /dashboard routes (Society Admin panel)
  if (pathname.startsWith('/dashboard')) {
    const cookieStore = req.cookies;
    const hasToken = Array.from(cookieStore.getAll()).some(c => c.name.includes('auth-token'));
    if (!hasToken) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
