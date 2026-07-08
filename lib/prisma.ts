import Redis from "ioredis";

// Singleton pattern, same reasoning as lib/prisma.ts —
// avoids creating a new Redis connection on every hot-reload in development.

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL as string, {
    maxRetriesPerRequest: 3,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// ── Slot hold helpers ──
// Keys are namespaced as `slot-hold:{slotId}` and store the userId (or guest session id)
// that currently holds the slot. TTL enforces the 5-minute auto-release from our
// acceptance criteria — no separate cron job needed, Redis expires the key automatically.

const HOLD_TTL_SECONDS = 5 * 60; // 5 minutes

export async function createSlotHold(slotId: string, holderId: string): Promise<boolean> {
  // "NX" = only set if the key does not already exist — this is the atomic operation
  // that prevents two customers from both successfully holding the same slot.
  const result = await redis.set(
    `slot-hold:${slotId}`,
    holderId,
    "EX",
    HOLD_TTL_SECONDS,
    "NX"
  );

  return result === "OK";
}

export async function getSlotHold(slotId: string): Promise<string | null> {
  return redis.get(`slot-hold:${slotId}`);
}

export async function releaseSlotHold(slotId: string, holderId: string): Promise<boolean> {
  // Only release if the current holder matches — prevents accidentally releasing
  // a hold that belongs to someone else (e.g. a stale/duplicate request).
  const currentHolder = await redis.get(`slot-hold:${slotId}`);
  if (currentHolder !== holderId) return false;

  await redis.del(`slot-hold:${slotId}`);
  return true;
}

export async function getSlotHoldTTL(slotId: string): Promise<number> {
  // Returns remaining seconds on the hold — used to power the countdown timer UI.
  return redis.ttl(`slot-hold:${slotId}`);
}