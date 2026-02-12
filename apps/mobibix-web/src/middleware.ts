import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. Specify protected and public routes
const protectedRoutes = ['/dashboard', '/inventory', '/crm', '/settings'];
const publicRoutes = ['/signin', '/signup', '/', '/onboarding'];

export function middleware(request: NextRequest) {
  // 2. Check if the current route is protected or public
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
  const isPublicRoute = publicRoutes.includes(path);

  // 3. Decrypt the session from the cookie
  // NOTE: Currently tokens are in localStorage, so this middleware 
  // cannot fully validate auth. This is a placeholder for future cookie migration.
  // The client-side 'authGuard' and 'layout.tsx' handle the actual protection.
  // const cookie = cookies().get('session')?.value;
  // const session = await decrypt(cookie);

  // 4. Redirect based on session (Future implementation)
  /*
  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/signin', request.nextUrl));
  }
  */

  // 5. Allow access
  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
