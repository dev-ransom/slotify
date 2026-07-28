"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  _count: { slots: number };
}

interface AvailabilityEditorProps {
  services: Service[];
  onServiceCreated: (service: Service) => void;
}

const TIME_PRESETS = ["09:00", "11:00", "13:00", "15:00", "17:00"];

export function AvailabilityEditor({
  services,
  onServiceCreated,
}: AvailabilityEditorProps) {
  // ── New service form ──
  const [name, setName] = useState("");
  const [durationMin, setDurationMin] = useState("30");
  const [price, setPrice] = useState(""); // dollars, converted to cents on submit
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // ── Slot generation form ──
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    services[0]?.id ?? "",
  );

  // Services load asynchronously in the parent — this component can mount
  // before that fetch resolves, locking selectedServiceId to "" forever
  // (useState's initial value only applies once, on mount). This effect
  // keeps it in sync whenever the services list actually changes.
  useEffect(() => {
    if (!selectedServiceId && services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
    // If the previously-selected service was deleted/deactivated and no
    // longer appears in the list, fall back to the first available one
    // rather than silently submitting against a stale/invalid ID.
    if (
      selectedServiceId &&
      !services.some((s) => s.id === selectedServiceId)
    ) {
      setSelectedServiceId(services[0]?.id ?? "");
    }
  }, [services, selectedServiceId]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTimes, setSelectedTimes] = useState<string[]>([
    "09:00",
    "13:00",
  ]);
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [isGeneratingSlots, setIsGeneratingSlots] = useState(false);
  const [slotMessage, setSlotMessage] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  async function handleCreateService(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServiceError(null);

    const priceInCents = Math.round(parseFloat(price) * 100);
    if (
      !name.trim() ||
      !durationMin ||
      isNaN(priceInCents) ||
      priceInCents <= 0
    ) {
      setServiceError("Please fill in a valid name, duration, and price.");
      return;
    }

    setIsCreatingService(true);

    try {
      const res = await fetch("/api/provider/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          durationMin: parseInt(durationMin, 10),
          price: priceInCents,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServiceError(data.error ?? "Could not create service.");
        setIsCreatingService(false);
        return;
      }

      onServiceCreated({ ...data.service, _count: { slots: 0 } });
      setName("");
      setDurationMin("30");
      setPrice("");
    } catch {
      setServiceError("Network error — please try again.");
    } finally {
      setIsCreatingService(false);
    }
  }

  function toggleTime(time: string) {
    setSelectedTimes((prev) =>
      prev.includes(time)
        ? prev.filter((t) => t !== time)
        : [...prev, time].sort(),
    );
  }

  async function handleGenerateSlots(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSlotError(null);
    setSlotMessage(null);

    if (
      !selectedServiceId ||
      !startDate ||
      !endDate ||
      selectedTimes.length === 0
    ) {
      setSlotError(
        !selectedServiceId
          ? "Please select a service first."
          : "Please select a date range and at least one time.",
      );
      return;
    }

    setIsGeneratingSlots(true);

    try {
      const res = await fetch(
        `/api/provider/services/${selectedServiceId}/slots`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate,
            endDate,
            times: selectedTimes,
            excludeWeekends,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setSlotError(data.error ?? "Could not generate slots.");
        setIsGeneratingSlots(false);
        return;
      }

      setSlotMessage(`Created ${data.created} new time slots.`);
    } catch {
      setSlotError("Network error — please try again.");
    } finally {
      setIsGeneratingSlots(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Create a new service */}
      <div className="bg-surface-raised border border-surface-border rounded-card p-5">
        <h3 className="font-semibold text-neutral-50 mb-4">
          Add a new service
        </h3>
        <form
          onSubmit={handleCreateService}
          className="grid sm:grid-cols-3 gap-4"
        >
          <Input
            label="Service name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Duration (min)"
            type="number"
            min="5"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          />
          <Input
            label="Price (USD)"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <div className="sm:col-span-3">
            {serviceError && (
              <p role="alert" className="text-sm text-accent-rose mb-3">
                {serviceError}
              </p>
            )}
            <Button
              type="submit"
              className="w-auto px-6"
              isLoading={isCreatingService}
              loadingText="Creating..."
            >
              Add service
            </Button>
          </div>
        </form>
      </div>

      {/* Generate availability for an existing service */}
      {services.length > 0 && (
        <div className="bg-surface-raised border border-surface-border rounded-card p-5">
          <h3 className="font-semibold text-neutral-50 mb-4">
            Generate availability
          </h3>
          <form onSubmit={handleGenerateSlots} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-200 mb-1.5">
                Service
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full rounded-card border border-neutral-200 px-4 py-2.5 text-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s._count.slots} slots)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Start date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="End date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-200 mb-2">
                Times of day
              </label>
              <div className="flex flex-wrap gap-2">
                {TIME_PRESETS.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => toggleTime(time)}
                    className={`px-3 py-1.5 rounded-pill text-sm font-medium transition-colors ${
                      selectedTimes.includes(time)
                        ? "bg-brand-600 text-white"
                        : "bg-surface text-neutral-300 border border-surface-border hover:border-brand-600/50"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={excludeWeekends}
                onChange={(e) => setExcludeWeekends(e.target.checked)}
                className="rounded border-neutral-400"
              />
              Exclude weekends
            </label>

            {slotError && (
              <p role="alert" className="text-sm text-accent-rose">
                {slotError}
              </p>
            )}
            {slotMessage && (
              <p role="status" className="text-sm text-brand-400">
                {slotMessage}
              </p>
            )}

            <Button
              type="submit"
              className="w-auto px-6"
              isLoading={isGeneratingSlots}
              loadingText="Generating..."
            >
              Generate slots
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
