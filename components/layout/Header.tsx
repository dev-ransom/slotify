"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  minimal?: boolean; // true = logo only, used on auth pages (login/signup/etc.)
}

export function Header({ minimal = false }: HeaderProps) {
  const { data: session, status } = useSession();

  return (
    <header
      className={`sticky top-0 z-40  ${minimal ? "bg-surface" : "bg-surface-raised border-b border-surface-border"}`}
    >
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo />

        {!minimal && (
          <>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-300">
              <Link
                href="/"
                className="hover:text-neutral-50 transition-colors"
              >
                Browse Services
              </Link>
              {session && (
                <Link
                  href="/dashboard"
                  className="hover:text-neutral-50 transition-colors"
                >
                  My Bookings
                </Link>
              )}
              {(session?.user as any)?.role === "PROVIDER" && (
                <Link
                  href="/provider"
                  className="hover:text-neutral-50 transition-colors"
                >
                  For Providers
                </Link>
              )}
              <Link
                href="/pricing"
                className="hover:text-neutral-50 transition-colors"
              >
                Pricing
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              {status === "loading" ? (
                <div className="w-20 h-9 rounded-card bg-surface-border animate-pulse" />
              ) : session ? (
                <>
                  <span className="hidden sm:inline text-sm text-neutral-300">
                    Hi, {session.user?.name?.split(" ")[0]}
                  </span>
                  <Button
                    variant="outline"
                    className="w-auto px-4"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-neutral-200 hover:text-neutral-50"
                  >
                    Sign in
                  </Link>
                  <Link href="/signup">
                    <Button className="w-auto px-4">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
