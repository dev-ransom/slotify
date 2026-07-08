import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createSlotHold, releaseSlotHold, getSlotHoldTTL } from "@/lib/redis";

// POST /api/slots/[slotId]/hold
// Attempts to place a temporary hold on a slot so it can't be booked by anyone else
// while the current user completes checkout.
export async function POST(
  req: Request,
  { params }: { params: { slotId: string } }
) {
  const { slotId } = params;
  const session = await auth();

  // Support both authenticated users and guests.
  // For guests, the client must send a stable guestSessionId (e.g. stored in a cookie).
  const body = await req.json().catch(() => ({}));
  const holderId = session?.user?.id ?? body.guestSessionId;

  if (!holderId) {
    return NextResponse.json(
      { error: "Missing user session or guest session id" },
      { status: 400 }
    );
  }

  // Confirm the slot exists and isn't already booked in Postgres before touching Redis.
  const slot = await prisma.slot.findUnique({ where: { id: slotId } });

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  if (slot.status === "BOOKED") {
    return NextResponse.json(
      { error: "This slot has already been booked" },
      { status: 409 }
    );
  }

  // Atomic hold attempt — SET NX in Redis guarantees only one caller wins
  // even if two requests arrive at the same instant.
  const holdAcquired = await createSlotHold(slotId, holderId);

  if (!holdAcquired) {
    // Someone else already holds this slot (or it's a duplicate request from the same user —
    // that's fine, they'll just get a 409 and can retry/refresh state on the client).
    const currentHolder = await getSlotHoldTTL(slotId);
    return NextResponse.json(
      {
        error: "This slot is currently held by another user",
        retryAfterSeconds: currentHolder > 0 ? currentHolder : null,
      },
      { status: 409 }
    );
  }

  // Mirror the hold in Postgres as a durability/audit fallback (source of truth is Redis's TTL).
  const heldUntil = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.slot.update({
    where: { id: slotId },
    data: {
      status: "HELD",
      heldByUserId: session?.user?.id ?? null,
      heldUntil,
    },
  });

  return NextResponse.json({
    slotId,
    status: "HELD",
    heldUntil,
    ttlSeconds: 300,
  });
}

// DELETE /api/slots/[slotId]/hold
// Releases a hold — called when a user abandons checkout or navigates away.
export async function DELETE(
  req: Request,
  { params }: { params: { slotId: string } }
) {
  const { slotId } = params;
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const holderId = session?.user?.id ?? body.guestSessionId;

  if (!holderId) {
    return NextResponse.json(
      { error: "Missing user session or guest session id" },
      { status: 400 }
    );
  }

  const released = await releaseSlotHold(slotId, holderId);

  if (!released) {
    return NextResponse.json(
      { error: "Could not release hold — it may not belong to you or already expired" },
      { status: 403 }
    );
  }

  // Revert Postgres state back to available.
  await prisma.slot.update({
    where: { id: slotId },
    data: {
      status: "AVAILABLE",
      heldByUserId: null,
      heldUntil: null,
    },
  });

  return NextResponse.json({ slotId, status: "AVAILABLE" });
}

// GET /api/slots/[slotId]/hold
// Returns the current hold status and remaining TTL — used to power the countdown timer.
export async function GET(
  req: Request,
  { params }: { params: { slotId: string } }
) {
  const { slotId } = params;
  const ttl = await getSlotHoldTTL(slotId);

  if (ttl <= 0) {
    return NextResponse.json({ slotId, held: false });
  }

  return NextResponse.json({ slotId, held: true, ttlSeconds: ttl });
}