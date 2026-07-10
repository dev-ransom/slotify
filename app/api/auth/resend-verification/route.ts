import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// POST /api/auth/resend-verification
// Body: { email: string }
export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Same enumeration-safe pattern as forgot-password: don't reveal whether the account exists.
  if (!user || user.emailVerified) {
    return NextResponse.json({ message: "If applicable, a verification email has been sent." });
  }

  // Reuse VerificationToken with a distinct "verify:" prefix so it never collides
  // with password-reset tokens for the same email.
  await prisma.verificationToken.deleteMany({ where: { identifier: `verify:${email}` } });

  const token = randomBytes(32).toString("hex");

  await prisma.verificationToken.create({
    data: {
      identifier: `verify:${email}`,
      token,
      expires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });

  const verifyUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/auth/verify-email?token=${token}`;

  // TODO: wire up real email delivery (Resend) — tracked in CHANGELOG known limitations.
  console.log(`[email verification] ${email} → ${verifyUrl}`);

  return NextResponse.json({ message: "If applicable, a verification email has been sent." });
}