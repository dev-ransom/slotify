import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Creates a password reset token for the given email and stores it in the
 * VerificationToken table (same model NextAuth uses for email verification —
 * we reuse it here rather than adding a near-duplicate table).
 *
 * Any existing unused token for this email is deleted first, so a user
 * requesting multiple resets only ever has one valid link at a time.
 */
export async function createPasswordResetToken(email: string): Promise<string> {
  await prisma.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } });

  const token = randomBytes(32).toString("hex");

  await prisma.verificationToken.create({
    data: {
      identifier: `reset:${email}`,
      token,
      expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return token;
}

/**
 * Validates a reset token. Returns the associated email if valid, or null if
 * the token doesn't exist or has expired. Does NOT consume the token —
 * call consumePasswordResetToken() after the password is successfully changed.
 */
export async function validatePasswordResetToken(token: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record) return null;
  if (record.expires < new Date()) {
    // Clean up expired token opportunistically.
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return null;
  }
  if (!record.identifier.startsWith("reset:")) return null;

  return record.identifier.replace("reset:", "");
}

/**
 * Deletes a reset token after it's been used — prevents the same link
 * being used twice.
 */
export async function consumePasswordResetToken(token: string): Promise<void> {
  await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
}