import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/provider/services/[serviceId]/slots
// Body: {
//   startDate: string (ISO date, e.g. "2026-07-15"),
//   endDate: string (ISO date, inclusive),
//   times: string[] (e.g. ["09:00", "13:00", "15:30"]) — in the provider's local time,
//   excludeWeekends?: boolean
// }
//
// Bulk-generates AVAILABLE slots for a service across a date range.
// This is the provider-facing counterpart to the customer-facing hold/checkout flow —
// without this route, availability could only ever come from the seed script.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ serviceId: string }>}
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId } = await params;
  const service = await prisma.service.findUnique({ where: { id: serviceId } });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  if (service.providerId !== session.user.id) {
    return NextResponse.json({ error: "You do not own this service" }, { status: 403 });
  }

  const { startDate, endDate, times, excludeWeekends } = await req.json();

  if (!startDate || !endDate || !Array.isArray(times) || times.length === 0) {
    return NextResponse.json(
      { error: "startDate, endDate, and a non-empty times array are required" },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  // Cap the range to avoid someone accidentally (or maliciously) generating
  // years' worth of slots in one request.
  const MAX_DAYS = 90;
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > MAX_DAYS) {
    return NextResponse.json(
      { error: `Date range cannot exceed ${MAX_DAYS} days` },
      { status: 400 }
    );
  }

  const slotsToCreate: { startTime: Date; endTime: Date; serviceId: string }[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
    if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

    for (const time of times) {
      const [hours, minutes] = time.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) continue;

      const slotStart = new Date(d);
      slotStart.setHours(hours, minutes, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + service.durationMin);

      slotsToCreate.push({
        startTime: slotStart,
        endTime: slotEnd,
        serviceId: service.id,
      });
    }
  }

  if (slotsToCreate.length === 0) {
    return NextResponse.json(
      { error: "No valid slots generated from the given parameters" },
      { status: 400 }
    );
  }

  const result = await prisma.slot.createMany({
    data: slotsToCreate,
    skipDuplicates: true,
  });

  return NextResponse.json(
    { created: result.count, requested: slotsToCreate.length },
    { status: 201 }
  );
}

// GET /api/provider/services/[serviceId]/slots
// Returns all slots for this service (including held/booked) so the provider
// can see their full calendar, not just availability.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId } = await params;
  const service = await prisma.service.findUnique({ where: { id: serviceId } });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  if (service.providerId !== session.user.id) {
    return NextResponse.json({ error: "You do not own this service" }, { status: 403 });
  }

  const slots = await prisma.slot.findMany({
    where: {  serviceId },
    include: { booking: true },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({ slots });
}