"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Slot, SlotPickerProps } from "@/types";


const dayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const statusStyles: Record<Slot["status"], string> = {
  AVAILABLE:
    "bg-slot-available-bg text-slot-available border border-slot-available/30 hover:bg-brand-600 hover:text-white cursor-pointer",
  HELD: "bg-slot-held-bg text-slot-held border border-slot-held/30 cursor-not-allowed opacity-70",
  BOOKED:
    "bg-slot-booked-bg text-slot-booked border border-surface-border cursor-not-allowed opacity-50",
};

export function SlotPicker({
  slotsByDate,
  onSelectSlot,
  isHolding,
  holdingSlotId,
}: SlotPickerProps) {
  const dateKeys = useMemo(
    () => Object.keys(slotsByDate).sort(),
    [slotsByDate],
  );
  const [activeDate, setActiveDate] = useState(dateKeys[0] ?? null);

  if (dateKeys.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-surface-border rounded-card">
        <p className="text-neutral-400">
          No available time slots in the next 2 weeks.
        </p>
      </div>
    );
  }

  const activeSlots = activeDate ? slotsByDate[activeDate] : [];

  return (
    <div>
      {/* Day selector — horizontally scrollable strip of dates */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-5"
        role="tablist"
        aria-label="Select a date"
      >
        {dateKeys.map((dateKey) => {
          const date = new Date(`${dateKey}T00:00:00`);
          const isActive = dateKey === activeDate;
          return (
            <button
              key={dateKey}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveDate(dateKey)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-card text-sm font-medium transition-colors focus:outline-none ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "bg-surface-raised text-neutral-300 border border-surface-border hover:border-brand-600/50"
              }`}
            >
              {dayFormatter.format(date)}
            </button>
          );
        })}
      </div>

      {/* Time slots for the selected day */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        role="group"
        aria-label={`Available times for ${activeDate ? dayFormatter.format(new Date(`${activeDate}T00:00:00`)) : ""}`}
      >
        {activeSlots.map((slot) => {
          const isClickable = slot.status === "AVAILABLE" && !isHolding;
          const isThisSlotLoading = isHolding && holdingSlotId === slot.id;

          return (
            <button
              key={slot.id}
              disabled={slot.status !== "AVAILABLE" || isHolding}
              onClick={() => isClickable && onSelectSlot(slot)}
              aria-label={
                slot.status === "AVAILABLE"
                  ? `Book ${timeFormatter.format(new Date(slot.startTime))}`
                  : slot.status === "HELD"
                    ? `${timeFormatter.format(new Date(slot.startTime))}, currently held by another user`
                    : `${timeFormatter.format(new Date(slot.startTime))}, already booked`
              }
              className={`relative flex items-center justify-center gap-2 rounded-card py-3 px-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface ${statusStyles[slot.status]}`}
            >
              {isThisSlotLoading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                timeFormatter.format(new Date(slot.startTime))
              )}
            </button>
          );
        })}
      </div>

      {/* Legend — clarifies the three states at a glance */}
      <div className="flex flex-wrap gap-4 mt-5 text-xs text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slot-available-bg border border-slot-available/30" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slot-held-bg border border-slot-held/30" />
          Held by another user
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slot-booked-bg border border-surface-border" />
          Booked
        </span>
      </div>
    </div>
  );
}
