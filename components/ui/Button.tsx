"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  isLoading?: boolean;
  loadingText?: string;
}

const variantStyles = {
  primary:
    "bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500 glow-hover",
  secondary:
    "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 focus:ring-neutral-400",
  outline: "border border-[#2E2E2E]  text-neutral-400 focus:ring-brand-500",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      isLoading = false,
      loadingText,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`w-full flex items-center justify-center gap-2 rounded-card cursor-pointer py-2.5 px-4 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${variantStyles[variant]} ${className ?? ""}`}
        {...props}
      >
        {isLoading ? (loadingText ?? "Loading...") : children}
      </button>
    );
  },
);

Button.displayName = "Button";
