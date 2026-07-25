import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/bookings
// Returns the logged-in user's bookings, split into upcoming and past
// based on the slot's start time relative to now.
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    include: {
      slot: { include: { service: true } },
    },
    orderBy: { slot: { startTime: "asc" } },
  });

  const now = new Date();
  const upcoming = bookings.filter(
    (b) => b.slot.startTime >= now && b.status !== "CANCELLED"
  );
  const past = bookings.filter(
    (b) => b.slot.startTime < now || b.status === "CANCELLED"
  );

  return NextResponse.json({ upcoming, past });
}