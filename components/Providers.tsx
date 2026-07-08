"use client";

import { SessionProvider } from "next-auth/react";

// Wraps the app so client components (like LoginForm, SignupForm) can use
// next-auth/react hooks such as signIn(), signOut(), and useSession().
// Must be a Client Component — SessionProvider relies on React context,
// which cannot be used directly in a Server Component.

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
