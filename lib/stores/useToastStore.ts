import { ToastStore } from "@/types";
import { create } from "zustand";


const AUTO_DISMISS_MS = 4000;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  showToast: (message, variant = "info") => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));

    // Auto-dismiss after a few seconds — the component doesn't need to remember
    // to clean up after itself, the store handles its own lifecycle.
    setTimeout(() => {
      get().dismissToast(id);
    }, AUTO_DISMISS_MS);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));