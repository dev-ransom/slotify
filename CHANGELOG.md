# Changelog

All notable changes to Slotify are documented here, organized by development phase rather than strict chronological/version order — this mirrors how the project was actually built and makes it easy to see progress against the full lifecycle (see `/docs` for the Idea, Requirements, and Design stages that preceded this).

## Phases Overview

- [x] Data Layer
- [x] Auth Layer
- [ ] Booking Engine *(in progress)*
- [ ] Frontend UI
- [ ] Testing
- [ ] Deployment

---

## Data Layer

- Defined Prisma schema: `User`, `Account`, `Session`, `Service`, `Slot`, `Booking` models
- Modeled `Slot.status` as an enum (`AVAILABLE`, `HELD`, `BOOKED`) to directly reflect the three-state UI required by the real-time slot picker
- Stored monetary values (`Service.price`, `Booking.amountPaid`) as integers (cents) to avoid floating-point rounding issues
- Designed `Booking` to support both authenticated users and guest checkout (`userId` optional, paired with `guestEmail`/`guestName`)
- Set up free-tier Prisma Postgres as the database, with credentials rotated after being inadvertently exposed during setup
- Wrote a seed script (`prisma/seed.ts`) generating realistic sample data: 3 services, 30 time slots across 5 days, and 1 confirmed sample booking
- Created a Prisma Client singleton (`lib/prisma.ts`) to prevent connection exhaustion from hot-reload in development

## Auth Layer

- Implemented authentication using NextAuth (Auth.js v5) with the Prisma adapter
- Configured two providers: Google OAuth and email/password credentials (hashed with bcrypt)
- Built a dedicated signup API route (`app/api/auth/signup`) since the Credentials provider only handles login, not account creation
- Added session callbacks to expose `role` (`CUSTOMER` / `PROVIDER` / `ADMIN`) on the session object, used later for route protection
- Designed guest checkout as a first-class flow rather than an afterthought — implemented via a signed, httpOnly session cookie (`lib/guest-session.ts`) rather than localStorage, since it needs to be readable server-side in API routes

## Booking Engine *(in progress)*

This is the technical core of the project: guaranteeing two customers can never book the same time slot, even under concurrent requests.

- Created a Redis client singleton (`lib/redis.ts`) with slot-hold helper functions (`createSlotHold`, `releaseSlotHold`, `getSlotHoldTTL`)
- Used Redis `SET ... NX` with a 5-minute TTL for atomic, auto-expiring slot holds — no cron job required for cleanup
- Built the slot-hold API route (`app/api/slots/[slotId]/hold`) with `POST` (acquire hold), `DELETE` (release hold), and `GET` (poll remaining TTL for the countdown timer UI)
- Built the Stripe webhook route (`app/api/webhooks/stripe`) as the single source of truth for payment confirmation — never trusting a client-side "success" redirect for anything financial
- Verified Stripe webhook signatures before processing any event, to guard against spoofed requests
- Resolved the identified race condition (payment confirmation landing at nearly the same moment as hold expiry) using a Postgres transaction: payment success takes priority over TTL expiry, since the customer has already been charged
- Added a defensive check to prevent duplicate bookings if a slot was somehow already confirmed before the webhook processed (logs for manual review rather than failing silently)
- On payment failure, the hold is released immediately rather than waiting out the full TTL, returning the slot to availability faster

---

## Known Limitations / Roadmap

- Confirmation emails not yet wired up (planned: Resend)
- No automated alerting yet for the rare "charged but booking failed" edge case — currently just logged
- Multi-provider marketplace, recurring bookings, and SMS reminders are explicitly out of scope for MVP (see `docs/02-requirements.md`)