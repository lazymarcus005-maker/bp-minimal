import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Middleware for Next.js - no-op for now
  // Passcode injection is handled at component level
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};

