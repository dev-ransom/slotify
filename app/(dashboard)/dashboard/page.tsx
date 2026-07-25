"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarX } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { BookingCard } from "@/components/dashboard/BookingCard";
import { Button } from "@/components/ui/Button";

interface Booking {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";
  amountPaid: number | null;
  slot: {
    startTime: string;
    service: {
      name: string;
      durationMin: number;
      currency: string;
    };
  };
}

export default function CustomerDashboardPage() {
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBookings() {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      setUpcoming(data.upcoming ?? []);
      setPast(data.past ?? []);
      setIsLoading(false);
    }
    fetchBookings();
  }, []);

  function handleCancelled(bookingId: string) {
    const cancelled = upcoming.find((b) => b.id === bookingId);
    if (!cancelled) return;
    setUpcoming((prev) => prev.filter((b) => b.id !== bookingId));
    setPast((prev) => [{ ...cancelled, status: "CANCELLED" }, ...prev]);
  }

  const activeBookings = activeTab === "upcoming" ? upcoming : past;

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-neutral-50 mb-6">My Bookings</h1>

        <div
          className="flex gap-2 border-b border-surface-border mb-6"
          role="tablist"
        >
          {(["upcoming", "past"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium cursor-pointer border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-brand-500 text-neutral-50"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {tab === "upcoming"
                ? `Upcoming (${upcoming.length})`
                : `Past (${past.length})`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 bg-surface-raised rounded-card animate-pulse"
              />
            ))}
          </div>
        ) : activeBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-surface-raised flex items-center justify-center mx-auto mb-4">
              <CalendarX
                size={24}
                className="text-neutral-500"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-lg font-semibold text-neutral-50 mb-1">
              {activeTab === "upcoming"
                ? "No upcoming bookings"
                : "No past bookings"}
            </h2>
            <p className="text-neutral-400 mb-6">
              {activeTab === "upcoming"
                ? "When you book a service, it'll show up here."
                : "Your completed and cancelled bookings will appear here."}
            </p>
            {activeTab === "upcoming" && (
              <Link href="/">
                <Button className="w-auto px-6 inline-flex">
                  Browse services
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {activeBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                id={booking.id}
                serviceName={booking.slot.service.name}
                startTime={booking.slot.startTime}
                durationMin={booking.slot.service.durationMin}
                amountPaid={booking.amountPaid}
                currency={booking.slot.service.currency}
                status={booking.status}
                isPast={activeTab === "past"}
                onCancelled={handleCancelled}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
