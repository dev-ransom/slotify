"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EmailVerificationNoticeProps {
  email: string;
}

const RESEND_COOLDOWN_SECONDS = 30;

export function EmailVerificationNotice({
  email,
}: EmailVerificationNoticeProps) {
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  async function handleResend() {
    setIsSending(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setMessage("Verification email resent.");
        setCooldown(RESEND_COOLDOWN_SECONDS);
        const interval = setInterval(() => {
          setCooldown((c) => {
            if (c <= 1) {
              clearInterval(interval);
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      } else {
        setMessage("Could not resend right now. Please try again shortly.");
      }
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto text-center">
      <div className="w-14 h-14 rounded-full bg-brand-500/15 flex items-center justify-center mx-auto mb-5">
        <MailCheck size={28} className="text-brand-400" aria-hidden="true" />
      </div>

      <h1 className="text-2xl font-bold text-neutral-50 mb-2">
        Verify your email
      </h1>
      <p className="text-neutral-400 mb-1">
        We&apos;ve sent a verification link to
      </p>
      <p className="text-neutral-100 font-medium mb-6">{email}</p>

      <p className="text-sm text-neutral-500 mb-6">
        Didn&apos;t get it? Check your spam folder, or resend below.
      </p>

      <Button
        variant="outline"
        onClick={handleResend}
        isLoading={isSending}
        loadingText="Resending..."
        disabled={cooldown > 0}
        className="w-auto px-6 inline-flex"
      >
        {cooldown > 0
          ? `Resend available in ${cooldown}s`
          : "Resend verification email"}
      </Button>

      {message && (
        <p role="status" className="text-sm text-neutral-400 mt-4">
          {message}
        </p>
      )}

      <p className="text-center text-sm text-neutral-400 mt-8">
        Wrong email?{" "}
        <Link
          href="/signup"
          className="text-brand-400 font-medium hover:text-brand-300"
        >
          Sign up again
        </Link>
      </p>
    </div>
  );
}
