import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const GUEST_COOKIE_NAME = "slotify_guest_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days — long enough to cover an abandoned-then-resumed checkout

/**
 * Returns the current guest session id from cookies, creating one if it doesn't exist yet.
 * This gives anonymous (non-logged-in) users a stable identifier so we can:
 *  - attribute a slot hold to them (see lib/redis.ts createSlotHold)
 *  - attach guestEmail/guestName to a Booking without requiring an account
 *
 * Must be called from a Server Component, Route Handler, or Server Action —
 * `next/headers` cookies() is not available in Client Components.
 */
export async function getOrCreateGuestSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(GUEST_COOKIE_NAME);

  if (existing?.value) {
    return existing.value;
  }

  const newGuestId = `guest_${randomUUID()}`;

  cookieStore.set(GUEST_COOKIE_NAME, newGuestId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  return newGuestId;
}

/**
 * Reads the guest session id without creating a new one.
 * Useful for read-only checks (e.g. "does this request have a guest identity at all?").
 */
export async function getGuestSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_COOKIE_NAME)?.value ?? null;
}

/**
 * Clears the guest session — call this after a guest's booking is confirmed
 * and, e.g., they choose to create an account, or after successful checkout
 * if you don't want the id reused.
 */
export async function clearGuestSessionId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_COOKIE_NAME);
}