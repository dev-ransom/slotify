import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/services?category=&search=
// Public route — returns all active services for the landing/browse page.
// No auth required; this is customer-facing browsing, not provider management.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      provider: { select: { name: true } },
      _count: {
        select: {
          slots: { where: { status: "AVAILABLE" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ services });
}