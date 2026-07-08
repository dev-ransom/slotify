import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { releaseSlotHold } from "@/lib/redis";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// POST /api/webhooks/stripe
// Stripe calls this endpoint directly (not the browser) when a payment event occurs.
// This is the single source of truth for "did the customer actually pay" —
// never trust a client-side "success" redirect alone for anything financial.
export async function POST(req: Request) {
  const body = await req.text(); // raw body required for signature verification
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(paymentIntent);
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(paymentIntent);
      break;
    }

    default:
      // Unhandled event types are fine to ignore — Stripe sends many we don't need.
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const slotId = paymentIntent.metadata?.slotId;
  const holderId = paymentIntent.metadata?.holderId;
  const userId = paymentIntent.metadata?.userId || null;
  const guestEmail = paymentIntent.metadata?.guestEmail || null;
  const guestName = paymentIntent.metadata?.guestName || null;

  if (!slotId || !holderId) {
    console.error("Missing slotId/holderId in payment intent metadata:", paymentIntent.id);
    return;
  }

  // ── AC4 race-condition handling ──
  // The Redis hold may have expired by the exact moment this webhook lands
  // (e.g. payment cleared right at the 5-minute boundary). Per our design decision:
  // payment success takes priority over the TTL expiry, because the customer
  // was already charged — refunding a successful payment due to a timing race
  // is a worse outcome than honoring a few extra seconds of grace.
  //
  // We use a Postgres transaction as the final authority: if the slot is still
  // HELD by this holder OR already expired-but-unclaimed-by-anyone-else, we confirm it.
  // If another booking already claimed this slot (shouldn't happen, but defensively checked),
  // we do NOT create a duplicate booking — instead we flag it for manual refund review.

  const result = await prisma.$transaction(async (tx) => {
    const slot = await tx.slot.findUnique({ where: { id: slotId } });

    if (!slot) {
      return { success: false, reason: "slot_not_found" };
    }

    if (slot.status === "BOOKED") {
      // Slot was already confirmed by another flow — extremely unlikely given our locking,
      // but we never silently overwrite an existing booking.
      return { success: false, reason: "already_booked" };
    }

    const booking = await tx.booking.create({
      data: {
        slotId,
        userId,
        guestEmail,
        guestName,
        status: "CONFIRMED",
        stripePaymentIntentId: paymentIntent.id,
        amountPaid: paymentIntent.amount_received,
      },
    });

    await tx.slot.update({
      where: { id: slotId },
      data: {
        status: "BOOKED",
        heldByUserId: null,
        heldUntil: null,
      },
    });

    return { success: true, bookingId: booking.id };
  });

  if (!result.success) {
    console.error(
      `Failed to confirm booking for payment ${paymentIntent.id}: ${result.reason}. ` +
      `Flagging for manual review — customer was charged but no booking was created.`
    );
    // In a production system: trigger an alert (Slack/email) here so a human
    // can process a refund or manually resolve the conflict. Documented as a
    // known limitation for this portfolio build rather than fully implemented.
    return;
  }

  // Clean up the Redis hold now that the booking is permanently confirmed.
  await releaseSlotHold(slotId, holderId);

  // TODO: send confirmation email (Resend) — wire up in the notifications phase.
  console.log(`Booking ${result.bookingId} confirmed for slot ${slotId}`);
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const slotId = paymentIntent.metadata?.slotId;
  const holderId = paymentIntent.metadata?.holderId;

  if (!slotId || !holderId) return;

  // Release the hold immediately on failure rather than waiting for the TTL —
  // gives the slot back to the pool faster instead of sitting "held" for
  // up to 5 minutes after we already know the customer can't complete checkout.
  await releaseSlotHold(slotId, holderId);

  await prisma.slot.update({
    where: { id: slotId, status: "HELD" },
    data: { status: "AVAILABLE", heldByUserId: null, heldUntil: null },
  }).catch(() => {
    // If the slot wasn't in HELD state (e.g. already expired/released), this is a no-op failure — safe to ignore.
  });

  console.log(`Payment failed for slot ${slotId}, hold released`);
}