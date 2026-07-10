import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/auth/verify-email?token=...
// This is the route the emailed verification link points to directly —
// clicking the link in the email hits this endpoint, which verifies and redirects.
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${origin}/login?verified=missing_token`);
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record || !record.identifier.startsWith("verify:") || record.expires < new Date()) {
    if (record) await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return NextResponse.redirect(`${origin}/login?verified=invalid`);
  }

  const email = record.identifier.replace("verify:", "");

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.delete({ where: { token } }).catch(() => {});

  return NextResponse.redirect(`${origin}/login?verified=success`);
}