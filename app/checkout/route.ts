import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSlotHold } from "@/lib/redis";
import { getOrCreateGuestSessionId } from "@/lib/guest-session";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// POST /api/checkout
// Body: { slotId: string, guestEmail?: string, guestName?: string }
//
// Creates a Stripe PaymentIntent for a slot the caller currently holds.
// The metadata attached here is what the Stripe webhook (app/api/webhooks/stripe)
// reads later to know which slot/holder/user to confirm the booking for —
// this route and that webhook are two halves of the same flow.
export async function POST(req: Request) {
  const { slotId, guestEmail, guestName } = await req.json();

  if (!slotId) {
    return NextResponse.json({ error: "slotId is required" }, { status: 400 });
  }

  const session = await auth();
  const holderId = session?.user?.id ?? (await getOrCreateGuestSessionId());

  // Guests must provide an email so we have somewhere to send confirmation.
  if (!session?.user?.id && !guestEmail) {
    return NextResponse.json(
      { error: "Guest checkout requires an email address" },
      { status: 400 }
    );
  }

  // Confirm this holder actually holds this slot right now — prevents someone
  // from creating a PaymentIntent for a slot they never held (or one that expired).
  const currentHolder = await getSlotHold(slotId);

  if (currentHolder !== holderId) {
    return NextResponse.json(
      { error: "You do not currently hold this slot, or your hold has expired" },
      { status: 409 }
    );
  }

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { service: true },
  });

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  // Server recalculates the price from the DB — never trust an amount sent from the client,
  // that's a classic price-tampering vulnerability.
  const amount = slot.service.price;

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount,
      currency: slot.service.currency,
      metadata: {
        slotId,
        holderId,
        userId: session?.user?.id ?? "",
        guestEmail: guestEmail ?? "",
        guestName: guestName ?? "",
        serviceName: slot.service.name,
      },
    },
    {
      // Prevents Stripe from accidentally double-charging if the client retries
      // this request (e.g. due to a flaky network) for the same hold.
      idempotencyKey: `checkout-${slotId}-${holderId}`,
    }
  );

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    amount,
    currency: slot.service.currency,
    serviceName: slot.service.name,
  });
}