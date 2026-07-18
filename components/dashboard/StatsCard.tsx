import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
}

export function StatsCard({ label, value, icon: Icon, hint }: StatsCardProps) {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-400">{label}</span>
        <Icon size={18} className="text-brand-400" aria-hidden="true" />
      </div>
      <p className="text-2xl font-bold text-neutral-50">{value}</p>
      {hint && <p className="text-xs text-neutral-500 mt-1">{hint}</p>}
    </div>
  );
}
