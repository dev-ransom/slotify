import Link from "next/link";
import { Star } from "lucide-react";

interface ServiceCardProps {
  id: string;
  name: string;
  category?: string;
  badge?: "POPULAR" | "NEW";
  providerName: string;
  providerCredential?: string;
  durationMin: number;
  rating?: number;
  reviewCount?: number;
  price: number; // cents
  currency?: string;
}

const badgeStyles: Record<string, string> = {
  POPULAR: "bg-accent-amber/15 text-accent-amber",
  NEW: "bg-brand-100 text-brand-700",
};

export function ServiceCard({
  id,
  name,
  category,
  badge,
  providerName,
  providerCredential,
  durationMin,
  rating,
  reviewCount,
  price,
  currency = "usd",
}: ServiceCardProps) {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: price % 100 === 0 ? 0 : 2,
  }).format(price / 100);

  return (
    <div className="group bg-surface-raised rounded-card border border-surface-border shadow-card hover:shadow-card-hover transition-shadow overflow-hidden flex flex-col">
      <div className="relative aspect-4/3 bg-neutral-100">
        {badge && (
          <span
            className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-pill ${badgeStyles[badge]}`}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        {category && (
          <span className="text-xs font-medium text-brand-600 uppercase tracking-wide mb-1">
            {category}
          </span>
        )}
        <h3 className="font-semibold text-neutral-50 mb-1">{name}</h3>

        <p className="text-sm text-neutral-500 mb-2">
          {providerName}
          {providerCredential && (
            <span className="text-neutral-400"> · {providerCredential}</span>
          )}
        </p>

        <div className="flex items-center gap-3 text-sm text-neutral-500 mb-3">
          <span>{durationMin} min</span>
          {rating && (
            <span className="flex items-center gap-1">
              <Star
                size={14}
                className="fill-accent-amber text-accent-amber"
                aria-hidden="true"
              />
              {rating.toFixed(1)}
              {reviewCount && (
                <span className="text-neutral-400">({reviewCount})</span>
              )}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            <span className="font-bold text-neutral-50">{formattedPrice}</span>
            <span className="text-xs text-neutral-400"> /session</span>
          </div>
          <Link
            href={`/services/${id}`}
            className="text-sm font-medium bg-brand-700 hover:bg-brand-800 text-white rounded-pill px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
