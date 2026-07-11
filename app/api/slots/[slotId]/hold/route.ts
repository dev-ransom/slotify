import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createSlotHold, releaseSlotHold, getSlotHoldTTL } from "@/lib/redis";
import { getOrCreateGuestSessionId } from "@/lib/guest-session";

// POST /api/slots/[slotId]/hold
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const { slotId } = await params;
  const session = await auth();
  const holderId = session?.user?.id ?? (await getOrCreateGuestSessionId());

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

  const holdAcquired = await createSlotHold(slotId, holderId);

  if (!holdAcquired) {
    const remainingTtl = await getSlotHoldTTL(slotId);
    return NextResponse.json(
      {
        error: "This slot is currently held by another user",
        retryAfterSeconds: remainingTtl > 0 ? remainingTtl : null,
      },
      { status: 409 }
    );
  }

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
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const { slotId } = await params;
  const session = await auth();
  const holderId = session?.user?.id ?? (await getOrCreateGuestSessionId());

  const released = await releaseSlotHold(slotId, holderId);

  if (!released) {
    return NextResponse.json(
      { error: "Could not release hold — it may not belong to you or already expired" },
      { status: 403 }
    );
  }

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
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const { slotId } = await params;
  const ttl = await getSlotHoldTTL(slotId);

  if (ttl <= 0) {
    return NextResponse.json({ slotId, held: false });
  }

  return NextResponse.json({ slotId, held: true, ttlSeconds: ttl });
}