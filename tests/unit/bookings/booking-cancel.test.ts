import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockBookingUpdate = vi.fn();
const mockSlotUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockRefundsCreate = vi.fn();
const mockAuth = vi.fn();

vi.mock("../../../auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      update: (...args: any[]) => mockBookingUpdate(...args),
    },
    slot: {
      update: (...args: any[]) => mockSlotUpdate(...args),
    },
    // The route uses the ARRAY form of $transaction — i.e. it builds an array
    // of already-created Prisma promises and passes that array in, rather than
    // a callback. So this mock just needs to resolve that array, same as the
    // real Prisma client would.
    $transaction: (operations: any[]) => mockTransaction(operations),
  },
}));

vi.mock("stripe", () => {
  return {
    default: class MockStripe {
      refunds = {
        create: (...args: any[]) => mockRefundsCreate(...args),
      };
    },
  };
});

const { PATCH } = await import("../../../app/api/bookings/[bookingId]/cancel/route");

function buildRequest() {
  return new Request("http://localhost:3000/api/bookings/booking_1/cancel", {
    method: "PATCH",
  });
}

function buildParams(bookingId = "booking_1") {
  return { params: Promise.resolve({ bookingId }) };
}

const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday

describe("PATCH /api/bookings/[bookingId]/cancel", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockBookingUpdate.mockReset();
    mockSlotUpdate.mockReset();
    mockTransaction.mockReset();
    mockRefundsCreate.mockReset();
    mockAuth.mockReset();

    mockAuth.mockResolvedValue({ user: { id: "user_1" } });
    mockBookingUpdate.mockResolvedValue({ id: "booking_1", status: "CANCELLED" });
    mockSlotUpdate.mockResolvedValue({ id: "slot_1", status: "AVAILABLE" });
    // Default: resolve the transaction by awaiting whatever array of promises
    // the route already built — mirrors real Prisma's array-form behavior.
    mockTransaction.mockImplementation(async (operations: any[]) => Promise.all(operations));
  });

  it("cancels an upcoming confirmed booking owned by the requester", async () => {
    mockFindUnique.mockResolvedValue({
      id: "booking_1",
      userId: "user_1",
      status: "CONFIRMED",
      slotId: "slot_1",
      stripePaymentIntentId: "pi_test_123",
      slot: { startTime: futureDate },
    });
    mockRefundsCreate.mockResolvedValue({ id: "re_test_123" });

    const res = await PATCH(buildRequest(), buildParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockRefundsCreate).toHaveBeenCalledWith({ payment_intent: "pi_test_123" });
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: "booking_1" },
      data: { status: "CANCELLED" },
    });
    expect(mockSlotUpdate).toHaveBeenCalledWith({
      where: { id: "slot_1" },
      data: { status: "AVAILABLE", heldByUserId: null, heldUntil: null },
    });
    expect(data.message).toContain("refund issued");
  });

  it("rejects cancellation if the booking belongs to a different user", async () => {
    mockFindUnique.mockResolvedValue({
      id: "booking_1",
      userId: "someone_else",
      status: "CONFIRMED",
      slotId: "slot_1",
      slot: { startTime: futureDate },
    });

    const res = await PATCH(buildRequest(), buildParams());

    expect(res.status).toBe(403);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects cancellation of an already-cancelled booking", async () => {
    mockFindUnique.mockResolvedValue({
      id: "booking_1",
      userId: "user_1",
      status: "CANCELLED",
      slotId: "slot_1",
      slot: { startTime: futureDate },
    });

    const res = await PATCH(buildRequest(), buildParams());

    expect(res.status).toBe(409);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects cancellation of a booking whose slot time has already passed", async () => {
    mockFindUnique.mockResolvedValue({
      id: "booking_1",
      userId: "user_1",
      status: "CONFIRMED",
      slotId: "slot_1",
      slot: { startTime: pastDate },
    });

    const res = await PATCH(buildRequest(), buildParams());

    expect(res.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("still cancels the booking even if the Stripe refund call fails", async () => {
    mockFindUnique.mockResolvedValue({
      id: "booking_1",
      userId: "user_1",
      status: "CONFIRMED",
      slotId: "slot_1",
      stripePaymentIntentId: "pi_test_123",
      slot: { startTime: futureDate },
    });
    // Simulate Stripe being down / the refund call throwing.
    mockRefundsCreate.mockRejectedValue(new Error("Stripe API unavailable"));

    const res = await PATCH(buildRequest(), buildParams());
    const data = await res.json();

    // The booking must still be cancelled — a customer's ability to cancel
    // shouldn't hinge on a third-party API being available.
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(data.message).toContain("manually");
  });
});