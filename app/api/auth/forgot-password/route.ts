import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/token";

// POST /api/auth/forgot-password
// Body: { email: string }
export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Deliberately return the same success response whether or not the account exists —
  // this prevents email enumeration (an attacker probing which emails have accounts).
  if (!user || !user.password) {
    // !user.password covers Google-only accounts, which have no password to reset.
    return NextResponse.json({
      message: "If an account exists for this email, a reset link has been sent.",
    });
  }

  const token = await createPasswordResetToken(email);
  const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;

  // TODO: wire up real email delivery (Resend) — tracked in CHANGELOG known limitations.
  // For now, log the link so it's usable during local development/testing.
  console.log(`[password reset] ${email} → ${resetUrl}`);

  return NextResponse.json({
    message: "If an account exists for this email, a reset link has been sent.",
  });
}