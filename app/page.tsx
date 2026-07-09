"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { ServiceCard } from "@/components/services/ServiceCard";
import { Button } from "@/components/ui/Button";

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
  currency: string;
  provider: { name: string | null };
  _count: { slots: number };
}

const CATEGORIES = [
  "All Services",
  "Wellness",
  "Beauty & Spa",
  "Consulting",
  "Coaching",
  "Education",
];

export default function LandingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Services");

  useEffect(() => {
    async function fetchServices() {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/services?${params.toString()}`);
      const data = await res.json();
      setServices(data.services ?? []);
      setIsLoading(false);
    }

    const debounce = setTimeout(fetchServices, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      {/* Hero */}
      <section className="bg-linear-to-br from-brand-900 to-brand-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Find &amp; Book Any Service
          </h1>
          <p className="text-brand-100 mb-6">
            Discover professionals near you — from wellness to consulting, all
            in one place.
          </p>

          <div className="flex gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services, professionals, or categories..."
                aria-label="Search services"
                className="w-full rounded-pill pl-11 pr-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <Button className="w-auto px-8 rounded-pill">Search</Button>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category filter */}
        <div
          className="flex gap-2 overflow-x-auto pb-2 mb-8"
          role="tablist"
          aria-label="Service categories"
        >
          {CATEGORIES.map((category) => (
            <button
              key={category}
              role="tab"
              aria-selected={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-4 py-2 rounded-pill text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                activeCategory === category
                  ? "bg-brand-600 text-white"
                  : "bg-surface-raised text-neutral-300 border border-surface-border hover:bg-neutral-800"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-neutral-50 mb-4">
          Featured Services
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-card bg-surface-raised border border-surface-border h-72 animate-pulse"
              />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-500">
              No services found. Try a different search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                id={service.id}
                name={service.name}
                providerName={service.provider.name ?? "Provider"}
                durationMin={service.durationMin}
                price={service.price}
                currency={service.currency}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
