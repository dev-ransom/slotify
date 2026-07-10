"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { Clock, User } from "lucide-react";
import { ServiceDetail, Slot } from "@/types";



export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams<{ serviceId: string }>();

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, Slot[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const [holdingSlotId, setHoldingSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServiceDetail() {
      const res = await fetch(`/api/services/${params.serviceId}`);
      if (!res.ok) {
        setError("This service could not be found.");
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      setService(data.service);
      setSlotsByDate(data.slotsByDate);
      setIsLoading(false);
    }
    fetchServiceDetail();
  }, [params.serviceId]);

  async function handleSelectSlot(slot: Slot) {
    setError(null);
    setIsHolding(true);
    setHoldingSlotId(slot.id);

    try {
      const res = await fetch(`/api/slots/${slot.id}/hold`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        // Someone else grabbed it first, or it's no longer available —
        // surface the specific reason rather than a generic failure.
        setError(
          data.error ??
            "This slot could not be held. Please pick another time.",
        );
        setIsHolding(false);
        setHoldingSlotId(null);
        return;
      }

      router.push(`/checkout/${slot.id}`);
    } catch {
      setError("Network error — please try again.");
      setIsHolding(false);
      setHoldingSlotId(null);
    }
  }

  const formattedPrice = service
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: service.currency.toUpperCase(),
        minimumFractionDigits: service.price % 100 === 0 ? 0 : 2,
      }).format(service.price / 100)
    : "";

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-2/3 bg-surface-raised rounded-card" />
            <div className="h-4 w-1/3 bg-surface-raised rounded-card" />
            <div className="h-64 bg-surface-raised rounded-card mt-8" />
          </div>
        ) : !service ? (
          <div className="text-center py-20">
            <p className="text-neutral-400">{error ?? "Service not found."}</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-50 mb-2">
                {service.name}
              </h1>
              {service.description && (
                <p className="text-neutral-400 mb-4">{service.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <User size={16} aria-hidden="true" />
                  {service.providerName ?? "Provider"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={16} aria-hidden="true" />
                  {service.durationMin} min
                </span>
                <span className="font-semibold text-neutral-50">
                  {formattedPrice}
                </span>
              </div>
            </div>

            <div className="bg-surface-raised border border-surface-border rounded-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-neutral-50 mb-4">
                Select a time
              </h2>

              {error && (
                <p role="alert" className="text-sm text-accent-rose mb-4">
                  {error}
                </p>
              )}

              <SlotPicker
                slotsByDate={slotsByDate}
                onSelectSlot={handleSelectSlot}
                isHolding={isHolding}
                holdingSlotId={holdingSlotId}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
