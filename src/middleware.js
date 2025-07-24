import { NextResponse } from 'next/server';

export function middleware(request) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/register',
    '/verify-email',
    '/set-password',
    '/forgot-password',
    '/reset-password',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify-email',
    '/api/auth/resend-verification',
    '/api/auth/logout',
    '/api/auth/check-auth',
    '/',
    '/about',
    '/contact',
    '/privacy-policy',
    '/terms-of-service'
  ];
  
  // Check if the current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  // Allow access to static assets and API routes
  const isStaticAsset = pathname.startsWith('/_next') || 
                        pathname.startsWith('/favicon.ico') ||
                        pathname.startsWith('/images/') ||
                        pathname.startsWith('/assets/');
  
  // For API routes, only check auth for specific endpoints
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicApiRoute = isApiRoute && (
    pathname.startsWith('/api/auth/') ||
    pathname === '/api/health'
  );
  
  // If it's a public route, API route or static asset, allow the request
  if (isPublicRoute || isStaticAsset || isPublicApiRoute) {
    return NextResponse.next();
  }
  
  // Check for authentication token in cookies
  const authToken = request.cookies.get('token')?.value;
  
  // Check for authentication in localStorage/sessionStorage via headers
  // This is a fallback since headers can contain auth info from client-side
  const authHeader = request.headers.get('authorization');
  const hasAuthHeader = authHeader && authHeader.startsWith('Bearer ');
  
  // If no token is found and it's not a public route, redirect to login
  if (!authToken && !hasAuthHeader) {
    // Create the URL to redirect to
    const loginUrl = new URL('/login', request.url);
    
    // Add the original URL as a query parameter so we can redirect back after login
    loginUrl.searchParams.set('callbackUrl', encodeURIComponent(request.url));
    
    return NextResponse.redirect(loginUrl);
  }
  
  // If token exists, proceed with the request
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * 1. /_next (static files)
     * 2. /favicon.ico, /images, /assets (static files)
     * 3. The specific public routes we've defined
     */
    '/((?!_next|favicon.ico|images|assets).*)',
  ],
}; 