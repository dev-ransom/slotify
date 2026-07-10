import Link from "next/link";
import { Star, ImageIcon } from "lucide-react";

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
  imageUrl?: string;
}

const badgeStyles: Record<string, string> = {
  POPULAR: "bg-accent-amber/20 text-accent-amber",
  NEW: "bg-brand-500/20 text-brand-400",
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
  imageUrl,
}: ServiceCardProps) {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: price % 100 === 0 ? 0 : 2,
  }).format(price / 100);

  return (
    <div className="group bg-surface-raised rounded-card border border-surface-border shadow-card hover:shadow-card-hover hover:border-brand-600/40 transition-all overflow-hidden flex flex-col">
      {/* Image / placeholder — fixed, moderate height instead of a tall aspect ratio,
          so the card doesn't look like a mostly-empty void when no image exists yet */}
      <div className="relative h-36 bg-neutral-800 flex items-center justify-center">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon
            size={28}
            className="text-neutral-600"
            aria-hidden="true"
          />
        )}
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
          <span className="text-xs font-medium text-brand-400 uppercase tracking-wide mb-1">
            {category}
          </span>
        )}
        <h3 className="font-semibold text-neutral-50 mb-1 leading-snug">
          {name}
        </h3>

        <p className="text-sm text-neutral-400 mb-2">
          {providerName}
          {providerCredential && (
            <span className="text-neutral-500"> · {providerCredential}</span>
          )}
        </p>

        <div className="flex items-center gap-3 text-sm text-neutral-400 mb-3">
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
                <span className="text-neutral-500">({reviewCount})</span>
              )}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2 border-t border-surface-border">
          <div>
            <span className="font-bold text-neutral-50">{formattedPrice}</span>
            <span className="text-xs text-neutral-500"> /session</span>
          </div>
          <Link
            href={`/services/${id}`}
            className="text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-pill px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface-raised"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
