"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong. Please try again.");
        setIsLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="w-14 h-14 rounded-full bg-brand-500/15 flex items-center justify-center mx-auto mb-5">
          <MailCheck size={28} className="text-brand-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-50 mb-2">
          Check your inbox
        </h1>
        <p className="text-neutral-400">
          If an account exists for{" "}
          <span className="text-neutral-200">{email}</span>, we&apos;ve sent a
          link to reset your password. It expires in 1 hour.
        </p>
        <Link
          href="/login"
          className="inline-block mt-6 text-sm font-medium text-brand-400 hover:text-brand-300"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-neutral-50">
          Forgot your password?
        </h1>
        <p className="text-neutral-400 mt-2">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm text-accent-rose">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={!email.trim() || isLoading}
          isLoading={isLoading}
          loadingText="Sending link..."
        >
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-neutral-400 mt-6">
        Remembered it?{" "}
        <Link
          href="/login"
          className="text-brand-400 font-medium hover:text-brand-300"
        >
          Back to login
        </Link>
      </p>
    </div>
  );
}
