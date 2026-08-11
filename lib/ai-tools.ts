import { Type, FunctionDeclaration } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { createSlotHold } from "@/lib/redis";

// ─────────────────────────────────────────────
// TOOL SCHEMAS — describe each function to Gemini, in its expected format.
// The model only ever sees these descriptions; it never gets direct database
// or Redis access. Every "action" it wants to take is routed through the
// actual implementation functions below, which we fully control.
//
// Note: the SDK requires its own `Type` enum (Type.STRING, Type.OBJECT, etc.)
// for schema definitions, not plain JS strings like "string" — this is a
// common gotcha when writing these schemas by hand.
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// TOOL SCHEMAS — describe each function to Gemini, in its expected format.
// ...
// ─────────────────────────────────────────────

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "search_services",
    description:
      "Search for bookable services by keyword or category (e.g. 'haircut', 'tutoring', 'consulting'). Returns matching services with their id, name, price, and duration.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "Keyword(s) describing what the user is looking for",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_available_slots",
    description:
      "Get upcoming available time slots for a specific service, given its serviceId (from a previous search_services result). Returns slot id, start time, and status.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        serviceId: { type: Type.STRING, description: "The service's id" },
      },
      required: ["serviceId"],
    },
  },
  {
    name: "hold_slot",
    description:
      "Places a temporary 5-minute hold on a specific time slot on the user's behalf, so it isn't booked by someone else while they decide. This does NOT charge any payment — it only reserves the slot. The user must still complete a separate checkout step to actually pay and confirm the booking.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        slotId: { type: Type.STRING, description: "The slot's id, from a previous get_available_slots result" },
      },
      required: ["slotId"],
    },
  },
];

export const assistantTools = [{ functionDeclarations }];

// ─────────────────────────────────────────────
// TOOL IMPLEMENTATIONS — the real logic behind each tool. These are the ONLY
// way the model can touch actual application data — narrow, purpose-built
// functions, not open database access.
// ─────────────────────────────────────────────

export async function executeSearchServices(query: string) {
  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 5,
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      currency: true,
      durationMin: true,
    },
  });

  return { services };
}

export async function executeGetAvailableSlots(serviceId: string) {
  const now = new Date();
  const twoWeeksOut = new Date(now);
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

  const slots = await prisma.slot.findMany({
    where: {
      serviceId,
      status: "AVAILABLE",
      startTime: { gte: now, lte: twoWeeksOut },
    },
    orderBy: { startTime: "asc" },
    take: 10,
    select: { id: true, startTime: true },
  });

  return { slots };
}

export async function executeHoldSlot(slotId: string, holderId: string) {
  const slot = await prisma.slot.findUnique({ where: { id: slotId } });

  if (!slot) {
    return { success: false, error: "That slot no longer exists." };
  }

  if (slot.status === "BOOKED") {
    return { success: false, error: "That slot has already been booked." };
  }

  const acquired = await createSlotHold(slotId, holderId);

  if (!acquired) {
    return { success: false, error: "That slot is currently held by someone else. Try another time." };
  }

  const heldUntil = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.slot.update({
    where: { id: slotId },
    data: { status: "HELD", heldByUserId: holderId, heldUntil },
  });

  return {
    success: true,
    slotId,
    checkoutUrl: `/checkout/${slotId}`,
    message: "Slot held for 5 minutes. Direct the user to the checkout link to complete payment.",
  };
}