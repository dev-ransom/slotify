"use client";

interface PasswordStrengthProps {
  password: string;
}

function getStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "bg-neutral-200" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-accent-rose" };
  if (score <= 3) return { score: 2, label: "Fair", color: "bg-accent-amber" };
  if (score === 4) return { score: 3, label: "Good", color: "bg-brand-500" };
  return { score: 4, label: "Strong", color: "bg-brand-600" };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label, color } = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5 h-1.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`flex-1 rounded-full transition-colors ${
              bar <= score ? color : "bg-neutral-200"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-neutral-500 mt-1.5">
        Password strength: <span className="font-medium">{label}</span>
      </p>
    </div>
  );
}
