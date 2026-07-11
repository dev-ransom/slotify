"use client";

import { useState, type FormEvent } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/Button";

interface PaymentFormProps {
  bookingSuccessUrl: string;
}

export function PaymentForm({ bookingSuccessUrl }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!stripe || !elements) return; // Stripe.js hasn't loaded yet

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: bookingSuccessUrl,
      },
    });

    // If confirmPayment succeeds, the browser redirects to `return_url` automatically —
    // this code below only runs if there's an immediate error (e.g. card declined).
    if (submitError) {
      setError(
        submitError.message ??
          "Payment could not be processed. Please try a different card.",
      );
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />

      {error && (
        <p role="alert" className="text-sm text-accent-rose">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements}
        isLoading={isProcessing}
        loadingText="Processing payment..."
      >
        Pay now
      </Button>

      <p className="text-xs text-neutral-500 text-center">
        Payments are securely processed by Stripe. Your card details never touch
        our servers.
      </p>
    </form>
  );
}
