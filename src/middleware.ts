
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware provides a basic server-side check.
// The primary, more robust authentication logic resides in the client-side `useAuth` hook.
export function middleware(request: NextRequest) {
    // Let the client-side logic in AuthProvider handle all routing decisions.
    // This middleware is kept for future-proofing or if more complex server-side
    // path-based rules are needed later.
    return NextResponse.next();
}

// Matcher to specify which routes the middleware should run on.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (image files)
     */
     '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
  ],
}
