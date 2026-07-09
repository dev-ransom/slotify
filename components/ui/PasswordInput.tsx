"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const inputId =
      id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div>
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-500 mb-1.5"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={`w-full rounded-card border px-4 py-2.5 pr-11 bg-surface text-white placeholder:text-neutral-400 placeholder:text-sm focus:outline-none transition-colors ${
              error ? "border-accent-rose" : "border-[#2E2E2E]"
            } ${className ?? ""}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute right-3 top-1/2 cursor-pointer -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none rounded"
          >
            {visible ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        </div>
        {hint && !error && (
          <p id={hintId} className="text-xs text-neutral-400 mt-1.5">
            {hint}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-sm text-accent-rose mt-1.5"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
