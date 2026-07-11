"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { CountdownTimerProps } from "@/types";


export function CountdownTimer({ slotId, onExpire }: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [hasExpired, setHasExpired] = useState(false);

  // Poll the real TTL from Redis (via the hold GET route) every few seconds,
  // rather than trusting a purely client-side countdown — this way, if the tab
  // was backgrounded/throttled, the displayed time self-corrects to the truth.
  useEffect(() => {
    let isMounted = true;

    async function poll() {
      try {
        const res = await fetch(`/api/slots/${slotId}/hold`);
        const data = await res.json();

        if (!isMounted) return;

        if (!data.held || data.ttlSeconds <= 0) {
          setHasExpired(true);
          onExpire();
          return;
        }

        setSecondsLeft(data.ttlSeconds);
      } catch {
        // Network hiccup — don't expire on a failed poll, just try again next tick.
      }
    }

    poll();
    const pollInterval = setInterval(poll, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [slotId, onExpire]);

  // Client-side ticking between polls, for a smooth countdown display.
  useEffect(() => {
    if (secondsLeft === null || hasExpired) return;

    const tick = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(tick);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [secondsLeft !== null, hasExpired]);

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
