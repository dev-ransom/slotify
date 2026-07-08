import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function assertOwnsService(userId: string, serviceId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { ok: false, status: 404, error: "Service not found" } as const;
  if (service.providerId !== userId) {
    return { ok: false, status: 403, error: "You do not own this service" } as const;
  }
  return { ok: true, service } as const;
}

// PATCH /api/provider/services/[serviceId]
// Body: any subset of { name, description, durationMin, price, currency, isActive }
export async function PATCH(
  req: Request,
  { params }: { params: { serviceId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const check = await assertOwnsService(session.user.id, params.serviceId);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const updates = await req.json();

  // Whitelist updatable fields — never spread the raw request body into `data`,
  // that would let a caller overwrite providerId or id.
  const allowed: Record<string, unknown> = {};
  for (const key of ["name", "description", "durationMin", "price", "currency", "isActive"]) {
    if (key in updates) allowed[key] = updates[key];
  }

  const service = await prisma.service.update({
    where: { id: params.serviceId },
    data: allowed,
  });

  return NextResponse.json({ service });
}

// DELETE /api/provider/services/[serviceId]
// Soft-delete via isActive: false rather than a hard delete — preserves booking history
// for slots/bookings tied to this service, and avoids cascading deletes wiping past records.
export async function DELETE(
  req: Request,
  { params }: { params: { serviceId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const check = await assertOwnsService(session.user.id, params.serviceId);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const service = await prisma.service.update({
    where: { id: params.serviceId },
    data: { isActive: false },
  });

  return NextResponse.json({ service });
}