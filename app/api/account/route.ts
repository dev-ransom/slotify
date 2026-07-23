import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/account
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      // Whether the account has a password set — determines if "Change password"
      // should even be shown (Google-only accounts have none).
      password: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    hasPassword: !!user.password,
  });
}

// PATCH /api/account
// Body: { name?: string, email?: string }
export async function PATCH(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email } = await req.json();
  const updates: Record<string, unknown> = {};

  if (typeof name === "string") updates.name = name.trim();
  if (typeof email === "string" && email.trim() !== session.user.email) {
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json(
        { error: "This email is already in use by another account" },
        { status: 409 }
      );
    }
    updates.email = email.trim();
    // Changing email invalidates prior verification — a real system would
    // re-trigger the verification flow here. Tracked as a known limitation
    // alongside the rest of the email-sending gaps in CHANGELOG.md.
    updates.emailVerified = null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updates,
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user });
}