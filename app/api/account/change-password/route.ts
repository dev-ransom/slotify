import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/account/change-password
// Body: { currentPassword: string, newPassword: string }
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user?.password) {
    // Google-only account — no password to verify against, and no password to change.
    return NextResponse.json(
      { error: "This account uses Google sign-in and has no password to change" },
      { status: 400 }
    );
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.password);

  if (!isCurrentValid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedNewPassword },
  });

  return NextResponse.json({ message: "Password updated successfully" });
}