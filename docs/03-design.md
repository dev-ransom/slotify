## Stage 3: Design

### 3a. System Design

**Slot-locking mechanism — three options, pick one and justify it:**

| Approach | How it works | Pros | Cons |
|---|---|---|---|
| **DB row lock + expiry column** | `slots` table has `held_by`, `held_until`. A cron/cleanup job or lazy check-on-read releases expired holds. | Simple, no new infra, easy to demo | Not truly real-time; relies on polling or cleanup job |
| **Redis with TTL** | On hold, write a key `slot:{id}` with 5-min TTL to Redis. Key auto-expires — no cleanup job needed. Postgres is source of truth for confirmed bookings only. | Elegant, auto-expiry is free, fast reads | Extra infra piece (Redis), added complexity to explain/justify |
| **DB transaction + optimistic locking (version column)** | Use `SELECT ... FOR UPDATE` or a version/timestamp column to prevent race conditions on booking confirmation. | Strong consistency guarantee | Doesn't inherently give you a "5 min countdown" — needs pairing with option 1 or 2 |

**why Redis:** Redis TTL for the hold (clean, auto-expiring, and a good "I know when to reach for the right tool" signal) + Postgres transaction on final booking confirmation to guarantee no double-write. This combo is genuinely how a lot of real booking systems (e.g. ticketing platforms) work — great talking point.

**Real-time updates to other clients:** WebSocket (Socket.io) or Server-Sent Events broadcasting "slot X held/released" events, so the calendar UI updates live without polling.

**High-level architecture:**

```
[React Frontend] ──WebSocket──> [Node/Express API] ──> [Redis: holds/TTL]
        │                              │
        │                              └──> [Postgres: bookings, users, services]
        │
        └──HTTP──> [Stripe Checkout] ──webhook──> [API confirms booking]
```

**Scale assumptions (worth stating explicitly in docs):** B2C, single-provider-per-tenant model, expect low-to-moderate concurrent traffic (this isn't Ticketmaster) — so no need to over-engineer with a queue system, but the Redis lock approach scales fine if it did grow.

---

### 3b. UX Design

**Key screens to wireframe** (I'd rough these out in Figma or even Excalidraw — doesn't need to be polished, just intentional):

1. **Service listing page** — cards with service name, duration, price
2. **Calendar/slot picker** — this is your hardest a11y challenge (keyboard-navigable date grid, clear visual state for available/held/booked)
3. **Checkout page** — slot countdown timer visible, Stripe element embedded
4. **Confirmation page**
5. **Customer dashboard** — upcoming/past bookings, cancel/reschedule actions
6. **Provider dashboard** — availability calendar editor, bookings list, basic stats

**Key UX decisions to document (with reasoning):**
- Countdown timer placement — persistent, not easy to miss, but not anxiety-inducing (avoid harsh red until under 1 min)
- Optimistic UI on cancel/reschedule — update UI immediately, roll back if the request fails
- Empty/error states — designed upfront, not an afterthought (no availability, payment failure, expired session)

---