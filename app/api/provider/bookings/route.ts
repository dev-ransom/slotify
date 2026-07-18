import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/provider/bookings
// Returns all bookings across every service owned by the logged-in provider,
// including guest bookings (which have no linked User).
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      slot: { service: { providerId: session.user.id } },
    },
    include: {
      slot: { include: { service: { select: { name: true, price: true, currency: true } } } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { slot: { startTime: "desc" } },
  });

  return NextResponse.json({ bookings });
}