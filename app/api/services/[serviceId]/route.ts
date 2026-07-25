import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/services/[serviceId]
// Public route — returns service details plus upcoming slots (next 14 days),
// grouped by date, for the slot picker UI.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await params;

  const service = await prisma.service.findUnique({
    where: { id: serviceId, isActive: true },
    include: {
      provider: { select: { name: true } },
    },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const now = new Date();
  const twoWeeksOut = new Date(now);
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

  const slots = await prisma.slot.findMany({
    where: {
      serviceId: serviceId,
      startTime: { gte: now, lte: twoWeeksOut },
    },
    orderBy: { startTime: "asc" },
  });

  // Group slots by date (YYYY-MM-DD) so the frontend can render a day-by-day picker
  // without doing date-bucketing logic client-side.
  const groupedByDate: Record<string, typeof slots> = {};
  for (const slot of slots) {
    const dateKey = slot.startTime.toISOString().split("T")[0];
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(slot);
  }

  return NextResponse.json({
    service: {
      id: service.id,
      name: service.name,
      description: service.description,
      durationMin: service.durationMin,
      category: service.category,
      price: service.price,
      currency: service.currency,
      providerName: service.provider.name,
    },
    slotsByDate: groupedByDate,
  });
}