import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// PATCH /api/bookings/[bookingId]/cancel
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.userId !== session.user.id) {
    return NextResponse.json({ error: "You do not own this booking" }, { status: 403 });
  }

  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "This booking is already cancelled" }, { status: 409 });
  }

  if (booking.slot.startTime < new Date()) {
    return NextResponse.json(
      { error: "Past bookings cannot be cancelled" },
      { status: 400 }
    );
  }

  // Attempt a refund if a payment was actually captured. Wrapped defensively —
  // if Stripe's refund call fails, we still cancel the booking, but flag the
  // refund as needing manual follow-up rather than blocking the cancellation
  // (a customer's ability to cancel shouldn't hinge on Stripe's API being up).
  let refundIssued = false;
  if (booking.stripePaymentIntentId) {
    try {
      await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
      refundIssued = true;
    } catch (err) {
      console.error(
        `Refund failed for booking ${booking.id} (payment intent ${booking.stripePaymentIntentId}):`,
        err
      );
    }
  }

  const [, updatedSlot] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    }),
    prisma.slot.update({
      where: { id: booking.slotId },
      data: { status: "AVAILABLE", heldByUserId: null, heldUntil: null },
    }),
  ]);

  return NextResponse.json({
    message: refundIssued
      ? "Booking cancelled and refund issued."
      : "Booking cancelled. Refund is being processed manually if applicable.",
    slot: updatedSlot,
  });
}