import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_SECURE_NAME } from "@/lib/auth-constants";

const protectedRoutes = ["/chat", "/onboarding", "/settings"];
const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function middleware(request: NextRequest) {
  const sessionToken =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ||
    request.cookies.get(SESSION_COOKIE_SECURE_NAME)?.value;

  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isExpired = request.nextUrl.searchParams.get("expired") === "true";

  // If the session was marked expired/invalid by server-side validation, clear stale cookies and allow /login
  if (isExpired) {
    const response = NextResponse.next();
    response.cookies.delete(SESSION_COOKIE_NAME);
    response.cookies.delete(SESSION_COOKIE_SECURE_NAME);
    return response;
  }

  // If trying to access protected routes without a session, redirect to login
  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Handle root / route
  if (pathname === "/") {
    return NextResponse.redirect(new URL(sessionToken ? "/chat" : "/login", request.url));
  }

  // If already authenticated and visiting login/signup, redirect to chat (unless error or expired)
  const hasAuthBypass = isExpired || request.nextUrl.searchParams.has("error");
  if (isAuthRoute && sessionToken && !hasAuthBypass) {
    const chatUrl = new URL("/chat", request.url);
    return NextResponse.redirect(chatUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, and static assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
