"use client";

import { Clock } from "lucide-react";
import { useSlotHoldCountdown } from "@/hooks/useSlotHoldCountdown";
import { CountdownTimerProps } from "@/types";

export function CountdownTimer({ slotId, onExpire }: CountdownTimerProps) {
  const { secondsLeft } = useSlotHoldCountdown(slotId, onExpire);

  if (secondsLeft === null) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft <= 60;

  return (
    <div
      role="timer"
      aria-live={isUrgent ? "assertive" : "polite"}
      className={`flex items-center gap-2 rounded-card px-4 py-2.5 text-sm font-medium transition-colors ${
        isUrgent
          ? "bg-accent-rose/10 text-accent-rose border border-accent-rose/30"
          : "bg-brand-500/10 text-brand-400 border border-brand-500/30"
      }`}
    >
      <Clock size={16} aria-hidden="true" />
      Slot held for{" "}
      <span className="font-bold tabular-nums">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
      {isUrgent && <span className="ml-1">— hurry!</span>}
    </div>
  );
}
