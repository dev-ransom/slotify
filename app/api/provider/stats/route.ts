import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/provider/stats
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalBookings, monthBookings, activeServiceCount] = await Promise.all([
    prisma.booking.count({
      where: {
        status: "CONFIRMED",
        slot: { service: { providerId: session.user.id } },
      },
    }),
    prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        createdAt: { gte: startOfMonth },
        slot: { service: { providerId: session.user.id } },
      },
      select: { amountPaid: true },
    }),
    prisma.service.count({
      where: { providerId: session.user.id, isActive: true },
    }),
  ]);

  const revenueThisMonth = monthBookings.reduce((sum, b) => sum + (b.amountPaid ?? 0), 0);

  return NextResponse.json({
    totalBookings,
    revenueThisMonthCents: revenueThisMonth,
    bookingsThisMonth: monthBookings.length,
    activeServiceCount,
  });
}