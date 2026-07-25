import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/bookings/status?slotId=...
// Polled by the booking-confirmation page while waiting for the Stripe webhook
// to finish processing (webhooks are async — the browser redirect back from
// Stripe often arrives before the webhook has been received and processed).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slotId = searchParams.get("slotId");

  if (!slotId) {
    return NextResponse.json({ error: "slotId is required" }, { status: 400 });
  }

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: {
      booking: true,
      service: { select: { name: true, price: true, currency: true } },
    },
  });

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  if (slot.status === "BOOKED" && slot.booking?.status === "CONFIRMED") {
    return NextResponse.json({
      status: "confirmed",
      booking: {
        id: slot.booking.id,
        serviceName: slot.service.name,
        startTime: slot.startTime,
        amountPaid: slot.booking.amountPaid,
        currency: slot.service.currency,
      },
    });
  }

  if (slot.status === "HELD") {
    return NextResponse.json({ status: "processing" });
  }

  // Slot reverted to AVAILABLE — payment failed or hold expired before webhook confirmed it.
  return NextResponse.json({ status: "failed" });
}