"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { X } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      placeholder,
      id,
      className,
      clearable = false,
      onClear,
      value,
      ...props
    },
    ref,
  ) => {
    const inputId =
      id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const hasValue =
      typeof value === "string"
        ? value.length > 0
        : value !== undefined && value !== null;

    return (
      <div>
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-400 mb-1.5"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            placeholder={placeholder}
            value={value}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={`w-full rounded-card border bg-surface placeholder:text-neutral-400 placeholder:text-sm px-4 py-2.5 text-white focus:outline-none transition-colors ${
              error ? "border-accent-rose" : "border-[#2E2E2E]"
            } ${clearable ? "pr-11" : ""} ${className ?? ""}`}
            {...props}
          />
          {clearable && hasValue && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear input"
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-400 hover:text-neutral-600  rounded"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
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

Input.displayName = "Input";
