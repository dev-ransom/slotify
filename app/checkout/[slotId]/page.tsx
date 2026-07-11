"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { Header } from "@/components/layout/Header";
import { CountdownTimer } from "@/components/booking/CountdownTimer";
import { PaymentForm } from "@/components/booking/PaymentForm";
import { Input } from "@/components/ui/Input";
import { getStripe } from "@/lib/get-stripe";
import { useSession } from "next-auth/react";
import { CheckoutData } from "@/types";

export default function CheckoutPage() {
  const params = useParams<{ slotId: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  const isGuest = !session?.user;

  async function createPaymentIntent() {
    setError(null);
    setIsCreatingIntent(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: params.slotId,
          guestEmail: isGuest ? guestEmail : undefined,
          guestName: isGuest ? guestName : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        setIsCreatingIntent(false);
        return;
      }

      setCheckoutData(data);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setIsCreatingIntent(false);
    }
  }

  // For logged-in users, kick off the PaymentIntent immediately.
  // For guests, wait until they've entered an email (form below).
  useEffect(() => {
    if (!isGuest && !checkoutData) {
      createPaymentIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);

  function handleExpire() {
    setExpired(true);
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-surface">
        <Header />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-neutral-50 mb-2">
            This slot has expired
          </h1>
          <p className="text-neutral-400 mb-6">
            Your hold on this time slot ran out. Please pick a new time.
          </p>
          <button
            onClick={() => router.back()}
            className="text-brand-400 font-medium hover:text-brand-300"
          >
            ← Choose a new time
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-neutral-50">Checkout</h1>
          <CountdownTimer slotId={params.slotId} onExpire={handleExpire} />
        </div>

        {checkoutData && (
          <div className="bg-surface-raised border border-surface-border rounded-card p-5 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">
                {checkoutData.serviceName}
              </span>
              <span className="font-semibold text-neutral-50">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: checkoutData.currency.toUpperCase(),
                }).format(checkoutData.amount / 100)}
              </span>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-accent-rose mb-4">
            {error}
          </p>
        )}

        {isGuest && !checkoutData && (
          <div className="bg-surface-raised border border-surface-border rounded-card p-5 mb-6 space-y-4">
            <p className="text-sm text-neutral-400">
              Continue as a guest — we just need an email to send your
              confirmation.
            </p>
            <Input
              label="Full name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              required
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
            <button
              onClick={createPaymentIntent}
              disabled={!guestEmail || isCreatingIntent}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-card py-2.5 transition-colors"
            >
              {isCreatingIntent ? "Loading..." : "Continue to payment"}
            </button>
          </div>
        )}

        {isCreatingIntent && !checkoutData && (
          <div className="h-40 bg-surface-raised rounded-card animate-pulse" />
        )}

        {checkoutData && (
          <Elements
            stripe={getStripe()}
            options={{
              clientSecret: checkoutData.clientSecret,
              appearance: { theme: "night" },
            }}
          >
            <PaymentForm
              bookingSuccessUrl={`${window.location.origin}/booking-confirmation/pending?slotId=${params.slotId}`}
            />
          </Elements>
        )}
      </main>
    </div>
  );
}
