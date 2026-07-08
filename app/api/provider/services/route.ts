import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/provider/services
// Returns all services owned by the currently logged-in provider.
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user as any).role !== "PROVIDER" && (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — provider access only" }, { status: 403 });
  }

  const services = await prisma.service.findMany({
    where: { providerId: session.user.id },
    include: {
      _count: { select: { slots: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ services });
}

// POST /api/provider/services
// Body: { name, description?, durationMin, price, currency? }
// Creates a new service owned by the currently logged-in provider.
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user as any).role !== "PROVIDER" && (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — provider access only" }, { status: 403 });
  }

  const { name, description, durationMin, price, currency } = await req.json();

  if (!name || !durationMin || !price) {
    return NextResponse.json(
      { error: "name, durationMin, and price are required" },
      { status: 400 }
    );
  }

  if (typeof price !== "number" || price <= 0 || !Number.isInteger(price)) {
    return NextResponse.json(
      { error: "price must be a positive integer representing cents (e.g. 5000 = $50.00)" },
      { status: 400 }
    );
  }

  if (typeof durationMin !== "number" || durationMin <= 0) {
    return NextResponse.json(
      { error: "durationMin must be a positive number" },
      { status: 400 }
    );
  }

  const service = await prisma.service.create({
    data: {
      name,
      description: description ?? null,
      durationMin,
      price,
      currency: currency ?? "usd",
      providerId: session.user.id,
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}