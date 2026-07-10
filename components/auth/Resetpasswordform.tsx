"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is missing a token. Please request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-neutral-50 mb-2">
          Invalid reset link
        </h1>
        <p className="text-neutral-400 mb-6">
          This link is missing or malformed. Please request a new password
          reset.
        </p>
        <Link href="/forgot-password">
          <Button className="w-auto px-6 inline-flex">Request new link</Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="w-14 h-14 rounded-full bg-brand-500/15 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2
            size={28}
            className="text-brand-400"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-2xl font-bold text-neutral-50 mb-2">
          Password updated
        </h1>
        <p className="text-neutral-400">Redirecting you to login...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-neutral-50">
          Set a new password
        </h1>
        <p className="text-neutral-400 mt-2">
          Choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <PasswordInput
            label="New password"
            name="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrength password={password} />
        </div>

        <PasswordInput
          label="Confirm new password"
          name="confirmPassword"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm text-accent-rose">
            {error}
          </p>
        )}

        <Button
          type="submit"
          isLoading={isLoading}
          loadingText="Updating password..."
        >
          Reset password
        </Button>
      </form>
    </div>
  );
}
