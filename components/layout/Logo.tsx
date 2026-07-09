import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string | null; // pass null to render as plain (non-clickable) text, e.g. inside a form card
  className?: string;
}

const sizeStyles = {
  sm: { badge: "w-6 h-6 text-xs", text: "text-base" },
  md: { badge: "w-8 h-8 text-sm", text: "text-lg" },
  lg: { badge: "w-11 h-11 text-lg", text: "text-2xl" },
};

export function Logo({ size = "md", href = "/", className = "" }: LogoProps) {
  const { badge, text } = sizeStyles[size];

  const content = (
    <span
      className={`flex items-center gap-2 font-bold text-neutral-50 ${text} ${className}`}
    >
      <span
        className={`rounded-card bg-brand-600 flex items-center justify-center text-white shrink-0 ${badge}`}
        aria-hidden="true"
      >
        S
      </span>
      Slotify
    </span>
  );

  if (href === null) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}
