import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  const verifyToken = randomBytes(32).toString("hex");
await prisma.verificationToken.create({
  data: {
    identifier: `verify:${email}`,
    token: verifyToken,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
});
console.log(
  `[email verification] ${email} → ${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/auth/verify-email?token=${verifyToken}`
);

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}