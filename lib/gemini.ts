import { GoogleGenAI } from "@google/genai";

// Singleton pattern, same reasoning as lib/prisma.ts and lib/redis.ts —
// avoids reinitializing the client on every hot-reload in development.
//
// Using Google's Gemini API here instead of a paid provider (e.g. Anthropic)
// specifically because Gemini offers a genuine, permanent free tier
// (no credit card, ~1,500 requests/day on Gemini Flash) — keeping this
// project's entire stack at $0 cost, consistent with every other service
// choice made throughout (Prisma Postgres, Upstash Redis, Stripe test mode).
const globalForGemini = globalThis as unknown as {
  gemini: GoogleGenAI | undefined;
};

export const gemini =
  globalForGemini.gemini ??
  new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

if (process.env.NODE_ENV !== "production") {
  globalForGemini.gemini = gemini;
}

export const GEMINI_MODEL = "gemini-flash-lite-latest";