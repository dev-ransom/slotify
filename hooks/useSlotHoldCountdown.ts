import { useEffect, useState } from "react";

interface UseSlotHoldCountdownResult {
  secondsLeft: number | null;
  hasExpired: boolean;
}

/**
 * Polls the real hold TTL from the server every 5s (source of truth),
 * and ticks down locally between polls for a smooth per-second display.
 * Extracted from CountdownTimer so the polling/timing logic can be reused
 * anywhere a slot's remaining hold time needs to be known — not just in
 * the visible timer badge (e.g. disabling a "Pay now" button once expired).
 */
export function useSlotHoldCountdown(slotId: string, onExpire: () => void): UseSlotHoldCountdownResult {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [hasExpired, setHasExpired] = useState(false);

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

  return { secondsLeft, hasExpired };
}