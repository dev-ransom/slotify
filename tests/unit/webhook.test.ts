import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// Mock lib/prisma before importing the route, so the route's `prisma` import
// resolves to this mock instead of a real database client.
const mockTransaction = vi.fn();
const mockReleaseSlotHold = vi.fn();

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

vi.mock("../../lib/redis", () => ({
  releaseSlotHold: (...args: any[]) => mockReleaseSlotHold(...args),
  getSlotHold: vi.fn(),
}));

const { handlePaymentSuccess } = await import("../../app/api/webhooks/stripe/route");
function buildPaymentIntent(overrides: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent {
  return {
    id: "pi_test_123",
    amount_received: 5000,
    metadata: {
      slotId: "slot_abc",
      holderId: "user_1",
      userId: "user_1",
      guestEmail: "",
      guestName: "",
      serviceName: "Test Service",
    },
    ...overrides,
  } as Stripe.PaymentIntent;
}

describe("handlePaymentSuccess (Stripe webhook)", () => {
  beforeEach(() => {
    mockTransaction.mockReset();
    mockReleaseSlotHold.mockReset();
  });

  it("confirms the booking when the slot is still HELD", async () => {
    mockTransaction.mockImplementation(async (callback) => {
      // Simulate the Prisma transaction client's behavior for a valid HELD slot.
      const tx = {
        slot: {
          findUnique: vi.fn().mockResolvedValue({ id: "slot_abc", status: "HELD" }),
          update: vi.fn().mockResolvedValue({}),
        },
        booking: {
          create: vi.fn().mockResolvedValue({ id: "booking_1" }),
        },
      };
      return callback(tx);
    });

    const paymentIntent = buildPaymentIntent();
    await handlePaymentSuccess(paymentIntent);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    // Confirms the hold was cleaned up in Redis after a successful booking.
    expect(mockReleaseSlotHold).toHaveBeenCalledWith("slot_abc", "user_1");
  });

  it("does NOT create a duplicate booking if the slot is already BOOKED", async () => {
    const bookingCreateSpy = vi.fn();

    mockTransaction.mockImplementation(async (callback) => {
      const tx = {
        slot: {
          // Simulates the edge case: another process already confirmed this
          // slot as BOOKED before this webhook call ran its transaction.
          findUnique: vi.fn().mockResolvedValue({ id: "slot_abc", status: "BOOKED" }),
          update: vi.fn(),
        },
        booking: {
          create: bookingCreateSpy,
        },
      };
      return callback(tx);
    });

    const paymentIntent = buildPaymentIntent();
    await handlePaymentSuccess(paymentIntent);

    // The critical assertion: booking.create must NEVER be called in this case —
    // this is what prevents a duplicate/conflicting booking from being created.
    expect(bookingCreateSpy).not.toHaveBeenCalled();
    // And since nothing was confirmed, the Redis hold should not be released
    // as part of a "success" path (it's left for manual review instead).
    expect(mockReleaseSlotHold).not.toHaveBeenCalled();
  });

  it("does nothing if required metadata is missing from the payment intent", async () => {
    const paymentIntent = buildPaymentIntent({ metadata: {} as any });

    await handlePaymentSuccess(paymentIntent);

    // Without slotId/holderId, there's nothing safe to confirm —
    // the transaction should never even be attempted.
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("records the correct payment amount on the booking", async () => {
    let capturedBookingData: any;

    mockTransaction.mockImplementation(async (callback) => {
      const tx = {
        slot: {
          findUnique: vi.fn().mockResolvedValue({ id: "slot_abc", status: "HELD" }),
          update: vi.fn().mockResolvedValue({}),
        },
        booking: {
          create: vi.fn().mockImplementation((args) => {
            capturedBookingData = args.data;
            return { id: "booking_1" };
          }),
        },
      };
      return callback(tx);
    });

    const paymentIntent = buildPaymentIntent({ amount_received: 7500 });
    await handlePaymentSuccess(paymentIntent);

    expect(capturedBookingData.amountPaid).toBe(7500);
    expect(capturedBookingData.stripePaymentIntentId).toBe("pi_test_123");
  });
});