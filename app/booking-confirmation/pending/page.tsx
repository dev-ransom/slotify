"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, CalendarPlus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";

interface BookingInfo {
  id: string;
  serviceName: string;
  startTime: string;
  amountPaid: number;
  currency: string;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 15; // ~30 seconds — generous, webhooks are usually near-instant

export default function BookingConfirmationPendingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slotId = searchParams.get("slotId");

  const [status, setStatus] = useState<
    "processing" | "confirmed" | "failed" | "timeout"
  >("processing");
  const [booking, setBooking] = useState<BookingInfo | null>(null);

  useEffect(() => {
    if (!slotId) {
      setStatus("failed");
      return;
    }

    let attempts = 0;
    let cancelled = false;

    async function poll() {
      attempts++;

      try {
        const res = await fetch(`/api/bookings/status?slotId=${slotId}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.status === "confirmed") {
          setBooking(data.booking);
          setStatus("confirmed");
          return;
        }

        if (data.status === "failed") {
          setStatus("failed");
          return;
        }

        // still "processing" — keep polling until we hit the cap
        if (attempts >= MAX_POLL_ATTEMPTS) {
          setStatus("timeout");
          return;
        }

        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (attempts >= MAX_POLL_ATTEMPTS) {
          setStatus("timeout");
        } else {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [slotId]);

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-20 text-center">
        {status === "processing" && (
          <>
            <Loader2
              size={40}
              className="text-brand-400 animate-spin mx-auto mb-5"
              aria-hidden="true"
            />
            <h1 className="text-2xl font-bold text-neutral-50 mb-2">
              Confirming your booking...
            </h1>
            <p className="text-neutral-400">
              Your payment went through — just finalizing the details. This
              usually takes a few seconds.
            </p>
          </>
        )}

        {status === "confirmed" && booking && (
          <>
            <div className="w-16 h-16 rounded-full bg-brand-500/15 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2
                size={32}
                className="text-brand-400"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-2xl font-bold text-neutral-50 mb-2">
              Booking confirmed!
            </h1>
            <p className="text-neutral-400 mb-6">
              You&apos;re all set. A confirmation has been sent to your email.
            </p>

            <div className="bg-surface-raised border border-surface-border rounded-card p-5 text-left mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neutral-400">Service</span>
                <span className="text-neutral-50 font-medium">
                  {booking.serviceName}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neutral-400">Date &amp; time</span>
                <span className="text-neutral-50 font-medium">
                  {new Date(booking.startTime).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Amount paid</span>
                <span className="text-neutral-50 font-medium">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: booking.currency.toUpperCase(),
                  }).format(booking.amountPaid / 100)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="w-auto flex-1">
                <CalendarPlus size={16} aria-hidden="true" />
                Add to calendar
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full">View my bookings</Button>
              </Link>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="w-16 h-16 rounded-full bg-accent-rose/15 flex items-center justify-center mx-auto mb-5">
              <XCircle
                size={32}
                className="text-accent-rose"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-2xl font-bold text-neutral-50 mb-2">
              Payment failed
            </h1>
            <p className="text-neutral-400 mb-6">
              Your payment could not be completed and no charge was made. Please
              try again with a different card or time slot.
            </p>
            <button
              onClick={() => router.push("/")}
              className="text-brand-400 font-medium hover:text-brand-300"
            >
              ← Back to browsing
            </button>
          </>
        )}

        {status === "timeout" && (
          <>
            <h1 className="text-2xl font-bold text-neutral-50 mb-2">
              Still processing...
            </h1>
            <p className="text-neutral-400 mb-6">
              This is taking longer than expected. Your payment may still have
              succeeded — check your bookings dashboard, or contact support if
              it doesn&apos;t show up shortly.
            </p>
            <Link
              href="/dashboard"
              className="text-brand-400 font-medium hover:text-brand-300"
            >
              Check my bookings →
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
