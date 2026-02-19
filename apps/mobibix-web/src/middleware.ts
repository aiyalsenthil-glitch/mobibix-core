import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * = MIDDLEWARE: Authentication & Route Protection
 * =
 * = Purpose: Enforce authentication on protected routes (server-side)
 * = Strategy: Check for accessToken cookie (set by backend on auth success)
 * =
 * = Benefits:
 * =  ✅ Server-side validation: No flash of wrong content
 * =  ✅ HttpOnly cookies: More secure than localStorage
 * =  ✅ Works with SSR/SSG: Frontend can render auth-dependent content
 * =  ✅ Middleware runs before page loads: Faster redirects
 */

// 1. Specify protected and public routes
const protectedRoutes = [
  "/dashboard",
  "/inventory",
  "/crm",
  "/sales",
  "/purchases",
  "/settings",
  "/profile",
  "/reports",
  "/shops",
  "/staff",
  "/customers",
  "/products",
];
const publicRoutes = ["/signin", "/signup", "/", "/onboarding"];

export function middleware(request: NextRequest) {
  // 2. Check if the current route is protected or public
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route),
  );
  const isPublicRoute = publicRoutes.includes(path);

  // 3. If public route, allow access without auth
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 4. Protected route: Check for mobi_session_token cookie
  //    ✅ Cookie is set by /api/auth/session on successful auth exchange
  //    ✅ Using a distinct name to avoid collision with cross-site backend cookies
  const accessToken = request.cookies.get("mobi_session_token")?.value;

  if (isProtectedRoute && !accessToken) {
    console.log(`[MIDDLEWARE] Redirecting ${path} to /signin: No session token`);
    // 5. Redirect to signin (server-side, prevents flash of authenticated content)
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("returnUrl", path); // For post-login redirect
    return NextResponse.redirect(url);
  }

  // 6. Allow access
  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
