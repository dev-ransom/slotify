import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock every external dependency the checkout route touches, so this test
// exercises only the route's own logic — not real DB, Redis, Stripe, or auth.
const mockFindUnique = vi.fn();
const mockGetSlotHold = vi.fn();
const mockPaymentIntentsCreate = vi.fn();
const mockAuth = vi.fn();

vi.mock("../../auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    slot: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
  },
}));

vi.mock("../../lib/redis", () => ({
  getSlotHold: (...args: any[]) => mockGetSlotHold(...args),
}));

vi.mock("../../lib/guest-session", () => ({
  getOrCreateGuestSessionId: vi.fn().mockResolvedValue("guest_abc123"),
}));

vi.mock("stripe", () => {
  return {
    default: class MockStripe {
      paymentIntents = {
        create: (...args: any[]) => mockPaymentIntentsCreate(...args),
      };
    },
  };
});

const { POST } = await import("../../app/api/checkout/route");

function buildRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout — server-side price verification", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockGetSlotHold.mockReset();
    mockPaymentIntentsCreate.mockReset();
    mockAuth.mockReset();

    // Default: logged-in user who currently holds the slot they're checking out.
    mockAuth.mockResolvedValue({ user: { id: "user_1" } });
    mockGetSlotHold.mockResolvedValue("user_1");
    mockPaymentIntentsCreate.mockResolvedValue({
      client_secret: "pi_secret_test",
    });
  });

  it("charges the price stored in the database, ignoring any amount sent by the client", async () => {
    mockFindUnique.mockResolvedValue({
      id: "slot_abc",
      service: { price: 5000, currency: "usd", name: "Real Service Price" },
    });

    // Attacker attempts to pay $0.01 instead of the real $50.00 price by
    // sneaking an "amount" field into the request body.
    const req = buildRequest({ slotId: "slot_abc", amount: 1 });
    await POST(req);

    expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);
    const [paymentIntentArgs] = mockPaymentIntentsCreate.mock.calls[0];

    // The critical assertion: Stripe is charged the real DB price (5000 cents),
    // completely regardless of the tampered "amount: 1" the client sent.
    expect(paymentIntentArgs.amount).toBe(5000);
    expect(paymentIntentArgs.amount).not.toBe(1);
  });

  it("rejects checkout if the caller does not currently hold the slot", async () => {
    mockFindUnique.mockResolvedValue({
      id: "slot_abc",
      service: { price: 5000, currency: "usd", name: "Test Service" },
    });
    // Someone else holds this slot, not the requester.
    mockGetSlotHold.mockResolvedValue("some_other_user");

    const req = buildRequest({ slotId: "slot_abc" });
    const res = await POST(req);

    expect(res.status).toBe(409);
    // Must never reach Stripe if the hold isn't valid — no payment should
    // ever be attempted for a slot the caller doesn't actually hold.
    expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
  });

  it("requires a guest email for unauthenticated checkout", async () => {
    mockAuth.mockResolvedValue(null); // not logged in
    mockGetSlotHold.mockResolvedValue("guest_abc123");

    const req = buildRequest({ slotId: "slot_abc" }); // no guestEmail provided
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
  });

  it("returns 404 if the slot does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const req = buildRequest({ slotId: "nonexistent_slot" });
    const res = await POST(req);

    expect(res.status).toBe(404);
    expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
  });
});