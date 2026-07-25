export interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  status: "AVAILABLE" | "HELD" | "BOOKED";
}

export interface SlotPickerProps {
  slotsByDate: Record<string, Slot[]>;
  onSelectSlot: (slot: Slot) => void;
  isHolding: boolean; // true while a hold request is in flight for the clicked slot
  holdingSlotId: string | null;
}

export interface ServiceDetail {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
  category: string | null;
  currency: string;
  providerName: string | null;
}

export interface CountdownTimerProps {
  slotId: string;
  onExpire: () => void;
}

export interface CheckoutData {
  clientSecret: string;
  amount: number;
  currency: string;
  serviceName: string;
}

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface ToastStore {
  toasts: Toast[];
  showToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
}

export interface BookingCardProps {
  id: string;
  serviceName: string;
  startTime: string;
  durationMin: number;
  amountPaid: number | null;
  currency: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";
  isPast: boolean;
  onCancelled: (bookingId: string) => void;
}