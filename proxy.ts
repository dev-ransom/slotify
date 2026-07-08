import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Route protection rules:
// - /dashboard, /settings  → any logged-in user (CUSTOMER, PROVIDER, or ADMIN)
// - /provider               → PROVIDER or ADMIN only
//
// Unauthenticated users are redirected to /login with a `callbackUrl` so they
// land back on the page they originally wanted after logging in — standard
// UX expectation, avoids dumping them on the dashboard with no context.

const PROVIDER_ONLY_PREFIXES = ["/provider"];
const AUTH_REQUIRED_PREFIXES = ["/dashboard", "/settings", "/provider"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const role = (req.auth?.user as any)?.role;

  const requiresAuth = AUTH_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const requiresProvider = PROVIDER_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (requiresAuth && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (requiresProvider && isLoggedIn && role !== "PROVIDER" && role !== "ADMIN") {
    // Logged in, but wrong role — send to their own dashboard rather than a bare 403,
    // friendlier for a customer who mistakenly hits a provider-only URL.
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

// Only run middleware on routes that actually need protection —
// keeps public pages (landing, service listing, login/signup) fast with zero overhead.
export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/provider/:path*"],
};