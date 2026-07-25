"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, DollarSign, Briefcase } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AvailabilityEditor } from "@/components/dashboard/Availabilityeditor";

interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  _count: { slots: number };
}

interface Booking {
  id: string;
  status: string;
  amountPaid: number | null;
  guestEmail: string | null;
  guestName: string | null;
  user: { name: string | null; email: string | null } | null;
  slot: { startTime: string; service: { name: string; currency: string } };
}

interface Stats {
  totalBookings: number;
  revenueThisMonthCents: number;
  bookingsThisMonth: number;
  activeServiceCount: number;
}

export default function ProviderDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "bookings">(
    "overview",
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const [statsRes, servicesRes, bookingsRes] = await Promise.all([
        fetch("/api/provider/stats"),
        fetch("/api/provider/services"),
        fetch("/api/provider/bookings"),
      ]);

      setStats(await statsRes.json());
      const servicesData = await servicesRes.json();
      setServices(servicesData.services ?? []);
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData.bookings ?? []);
      setIsLoading(false);
    }
    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-neutral-50 mb-6">
          Provider Dashboard
        </h1>

        {isLoading ? (
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 bg-surface-raised rounded-card animate-pulse"
              />
            ))}
          </div>
        ) : (
          stats && (
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <StatsCard
                label="Total bookings"
                value={stats.totalBookings.toString()}
                icon={CalendarCheck}
              />
              <StatsCard
                label="Revenue this month"
                value={new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(stats.revenueThisMonthCents / 100)}
                icon={DollarSign}
                hint={`${stats.bookingsThisMonth} bookings this month`}
              />
              <StatsCard
                label="Active services"
                value={stats.activeServiceCount.toString()}
                icon={Briefcase}
              />
            </div>
          )
        )}

        <div
          className="flex gap-2 border-b border-surface-border mb-6"
          role="tablist"
        >
          {(["overview", "bookings"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-brand-500 text-neutral-50"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {tab === "overview"
                ? "Services & Availability"
                : `Bookings (${bookings.length})`}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <AvailabilityEditor
            services={services}
            onServiceCreated={(s) => setServices((prev) => [...prev, s])}
          />
        )}

        {activeTab === "bookings" && (
          <div className="bg-surface-raised border border-surface-border rounded-card overflow-hidden">
            {bookings.length === 0 ? (
              <p className="text-center text-neutral-400 py-10">
                No bookings yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-neutral-400">
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-surface-border last:border-0"
                    >
                      <td className="px-4 py-3 text-neutral-100">
                        {b.user?.name ?? b.guestName ?? "Guest"}
                        <span className="block text-xs text-neutral-500">
                          {b.user?.email ?? b.guestEmail}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-100">
                        {b.slot.service.name}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {new Date(b.slot.startTime).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          },
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-100">
                        {b.amountPaid
                          ? new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: b.slot.service.currency.toUpperCase(),
                            }).format(b.amountPaid / 100)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">{b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
