import { PrismaClient } from "@prisma/client";

// Prevents creating a new PrismaClient instance on every hot-reload in development,
// which would otherwise exhaust database connections quickly.
// In production, a single instance is created per server process.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}