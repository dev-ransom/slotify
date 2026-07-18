"use client";

import { useState } from "react";
import { Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToastStore } from "@/lib/stores/useToastStore";
import { BookingCardProps } from "@/types";

const statusStyles: Record<string, string> = {
  CONFIRMED: "bg-brand-500/15 text-brand-400",
  CANCELLED: "bg-neutral-700 text-neutral-400",
  REFUNDED: "bg-accent-amber/15 text-accent-amber",
  PENDING: "bg-accent-amber/15 text-accent-amber",
};

export function BookingCard({
  id,
  serviceName,
  startTime,
  durationMin,
  amountPaid,
  currency,
  status,
  isPast,
  onCancelled,
}: BookingCardProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const showToast = useToastStore((state) => state.showToast);
  const date = new Date(startTime);
  const canCancel = !isPast && status === "CONFIRMED";

  async function handleCancel() {
    setIsCancelling(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not cancel this booking.");
        showToast(data.error ?? "Could not cancel this booking.", "error");
        setIsCancelling(false);
        return;
      }
      showToast("Booking cancelled successfully.", "success");
      onCancelled(id);
    } catch {
      setError("Network error — please try again.");
      setIsCancelling(false);
    }
  }

  return (
    <div className="bg-surface-raised border border-surface-border rounded-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-neutral-50">{serviceName}</h3>
          <div className="flex items-center gap-3 text-sm text-neutral-400 mt-1">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} aria-hidden="true" />
              {date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} aria-hidden="true" />
              {date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              · {durationMin} min
            </span>
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-pill ${statusStyles[status]}`}
        >
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </span>
      </div>

      {amountPaid !== null && (
        <p className="text-sm text-neutral-400 mb-3">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency.toUpperCase(),
          }).format(amountPaid / 100)}{" "}
          paid
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-accent-rose mb-3">
          {error}
        </p>
      )}

      {canCancel && !showConfirm && (
        <Button
          variant="outline"
          className="w-auto px-4"
          onClick={() => setShowConfirm(true)}
        >
          Cancel booking
        </Button>
      )}

      {canCancel && showConfirm && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-300">
            Cancel and refund this booking?
          </span>
          <Button
            variant="outline"
            className="w-auto px-4 border-accent-rose/40 text-accent-rose hover:bg-accent-rose/10"
            onClick={handleCancel}
            isLoading={isCancelling}
            loadingText="Cancelling..."
          >
            Yes, cancel
          </Button>
          <button
            onClick={() => setShowConfirm(false)}
            className="text-sm text-neutral-400 hover:text-neutral-200"
          >
            Never mind
          </button>
        </div>
      )}
    </div>
  );
}
