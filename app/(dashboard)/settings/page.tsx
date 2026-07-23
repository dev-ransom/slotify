"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { Button } from "@/components/ui/Button";
import { useToastStore } from "@/lib/stores/useToastStore";

interface Account {
  name: string | null;
  email: string | null;
  role: string;
  hasPassword: boolean;
}

interface RecentBooking {
  id: string;
  slot: { startTime: string; service: { name: string } };
}

export default function AccountSettingsPage() {
  const showToast = useToastStore((state) => state.showToast);

  const [account, setAccount] = useState<Account | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Profile form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [accountRes, bookingsRes] = await Promise.all([
        fetch("/api/account"),
        fetch("/api/bookings"),
      ]);
      const accountData = await accountRes.json();
      const bookingsData = await bookingsRes.json();

      setAccount(accountData);
      setName(accountData.name ?? "");
      setEmail(accountData.email ?? "");
      setRecentBookings((bookingsData.upcoming ?? []).slice(0, 3));
      setIsLoading(false);
    }
    fetchData();
  }, []);

  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileError(null);
    setIsSavingProfile(true);

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setProfileError(data.error ?? "Could not update profile.");
        showToast(data.error ?? "Could not update profile.", "error");
        return;
      }

      showToast("Profile updated successfully.", "success");
    } catch {
      setProfileError("Network error — please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError(null);
    setIsSavingPassword(true);

    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      console.log("Password change response:", data);
      if (!res.ok) {
        setPasswordError(data.error ?? "Could not update password.");
        return;
      }

      showToast("Password changed successfully.", "success");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setPasswordError("Network error — please try again.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-10 space-y-4">
          <div className="h-40 bg-surface-raised rounded-card animate-pulse" />
          <div className="h-40 bg-surface-raised rounded-card animate-pulse" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <h1 className="text-2xl font-bold text-neutral-50">Account Settings</h1>

        {/* Profile */}
        <section className="bg-surface-raised border border-surface-border rounded-card p-5 sm:p-6">
          <h2 className="font-semibold text-neutral-50 mb-4">Profile</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {profileError && (
              <p role="alert" className="text-sm text-accent-rose">
                {profileError}
              </p>
            )}
            <Button
              type="submit"
              className="w-auto px-6"
              isLoading={isSavingProfile}
              loadingText="Saving..."
            >
              Save changes
            </Button>
          </form>
        </section>

        {/* Password — only shown for accounts that have one (not Google-only) */}
        {account?.hasPassword && (
          <section className="bg-surface-raised border border-surface-border rounded-card p-5 sm:p-6">
            <h2 className="font-semibold text-neutral-50 mb-4">
              Change password
            </h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <PasswordInput
                label="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <div>
                <PasswordInput
                  label="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <PasswordStrength password={newPassword} />
              </div>
              {passwordError && (
                <p role="alert" className="text-sm text-accent-rose">
                  {passwordError}
                </p>
              )}
              <Button
                type="submit"
                className="w-auto px-6"
                isLoading={isSavingPassword}
                loadingText="Updating..."
              >
                Update password
              </Button>
            </form>
          </section>
        )}

        {!account?.hasPassword && (
          <section className="bg-surface-raised border border-surface-border rounded-card p-5 sm:p-6">
            <h2 className="font-semibold text-neutral-50 mb-1">
              Sign-in method
            </h2>
            <p className="text-sm text-neutral-400">
              You&apos;re signed in with Google. Password changes aren&apos;t
              applicable to this account.
            </p>
          </section>
        )}

        {/* Recent bookings */}
        <section className="bg-surface-raised border border-surface-border rounded-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-50">Recent bookings</h2>
            <Link
              href="/dashboard"
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              View all
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <p className="text-sm text-neutral-400">No bookings yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentBookings.map((b) => (
                <li key={b.id} className="flex justify-between text-sm">
                  <span className="text-neutral-100">
                    {b.slot.service.name}
                  </span>
                  <span className="text-neutral-400">
                    {new Date(b.slot.startTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
