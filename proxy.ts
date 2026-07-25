import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PROVIDER_ONLY_PREFIXES = ["/provider"];
const AUTH_REQUIRED_PREFIXES = ["/dashboard", "/settings", "/provider"];

// Pages a logged-in user shouldn't be able to revisit — there's nothing useful
// for them to do on a login/signup form once they already have a session.
// Note: "/verify-email" is deliberately excluded — a freshly-signed-up user is
// logged in but may still want to see that screen (and its "skip" link).
const GUEST_ONLY_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const role = (req.auth?.user as any)?.role;

  const requiresAuth = AUTH_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const requiresProvider = PROVIDER_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isGuestOnlyRoute = GUEST_ONLY_ROUTES.some((prefix) => pathname.startsWith(prefix));

  if (requiresAuth && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (requiresProvider && isLoggedIn && role !== "PROVIDER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  if (isGuestOnlyRoute && isLoggedIn) {
    const landingSpot = role === "PROVIDER" || role === "ADMIN" ? "/provider" : "/dashboard";
    return NextResponse.redirect(new URL(landingSpot, req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/provider/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/verify-email",
    "/reset-password",
  ],
};
