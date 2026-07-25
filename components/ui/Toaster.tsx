"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToastStore } from "@/lib/stores/useToastStore";
import { ToastVariant } from "@/types";

const variantStyles: Record<
  ToastVariant,
  { bg: string; icon: typeof CheckCircle2 }
> = {
  success: { bg: "border-brand-500/40 bg-surface-raised", icon: CheckCircle2 },
  error: { bg: "border-accent-rose/40 bg-surface-raised", icon: XCircle },
  info: { bg: "border-surface-border bg-surface-raised", icon: Info },
};

const iconColor: Record<ToastVariant, string> = {
  success: "text-brand-400",
  error: "text-accent-rose",
  info: "text-neutral-400",
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const { bg, icon: Icon } = variantStyles[toast.variant];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2 }}
              role="status"
              className={`flex items-start gap-3 border rounded-card px-4 py-3 shadow-card-hover ${bg}`}
            >
              <Icon
                size={18}
                className={`mt-0.5 shrink-0 ${iconColor[toast.variant]}`}
                aria-hidden="true"
              />
              <p className="text-sm text-neutral-100 flex-1">{toast.message}</p>
              <button
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-neutral-500 hover:text-neutral-300 shrink-0"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
