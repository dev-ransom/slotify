"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  minimal?: boolean;
}

export function Header({ minimal = false }: HeaderProps) {
  const { data: session, status } = useSession();

  const role = (session?.user as any)?.role;
  const isProvider = role === "PROVIDER" || role === "ADMIN";
  const logoHref = !session ? "/" : isProvider ? "/provider" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 bg-surface-raised border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo href={logoHref} />

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
              {isProvider && (
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
                <UserMenu name={session.user?.name} isProvider={isProvider} />
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
