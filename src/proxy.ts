import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy for adding cache headers to API responses (Next.js 16 convention).
 * 
 * - GET requests to /api/* get stale-while-revalidate caching
 * - Excludes /api/backup and /api/csrf (sensitive endpoints)
 * - All other methods pass through unchanged
 */
export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const method = request.method;

    // Only process GET requests to API routes
    if (method !== 'GET' || !pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    // Skip caching for sensitive endpoints
    const noCacheEndpoints = ['/api/backup', '/api/csrf', '/api/access'];
    if (noCacheEndpoints.some((ep) => pathname.startsWith(ep))) {
        return NextResponse.next();
    }

    // Clone the response and add cache headers
    const response = NextResponse.next();

    // Cache API GET responses for 30 seconds, serve stale for up to 5 minutes
    response.headers.set(
        'Cache-Control',
        'public, max-age=30, stale-while-revalidate=300'
    );

    // Add Vary header to ensure proper cache key
    response.headers.set('Vary', 'Accept, Accept-Encoding');

    return response;
}

// Only run proxy on API routes
export const config = {
    matcher: '/api/:path*',
};

