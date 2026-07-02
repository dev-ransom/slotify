Requirements (Mini-PRD)
Core features (MVP — what "done" looks like):

 Browse available services + time slots (calendar view)
 Real-time slot locking (slot becomes unavailable the moment someone starts checkout — prevents double-booking)
 User auth (sign up/login, guest checkout option)
 Stripe checkout (test mode) with booking confirmation
 User dashboard: view/cancel/reschedule bookings
 Admin/provider dashboard: manage availability, view bookings
 Email confirmation (can mock or use a real service like Resend)

Non-functional requirements:

Slot state must update within ~1s across clients (no double-bookings) — this is your headline technical challenge
Fully responsive, WCAG AA accessible (keyboard nav on calendar is notoriously hard — good to showcase)
Checkout flow must handle failure gracefully (payment fails, slot taken mid-checkout, network drop)
Page load under 2s, Lighthouse performance score 90+

Out of scope for MVP (goes in your "roadmap" — shows maturity to explicitly scope things out):
Multi-provider marketplace
Recurring bookings
SMS reminders

Tech stack suggestion: React + TypeScript, Zustand or Redux Toolkit for state, Stripe test API, a lightweight backend (Node/Express or Next.js API routes + a real DB like Postgres/Supabase — avoids the "no backend" red flag reviewers look for).

Here are user stories covering the core flows — grouped by role, in standard format so they slot straight into your requirements doc or a Jira/Linear board if you use one for the "PM" stage.

**Customer**

- As a customer, I want to browse available services and time slots so I can find one that fits my schedule.
- As a customer, I want to see real-time slot availability so I don't waste time picking a slot someone else just booked.
- As a customer, I want a slot to be temporarily held while I complete checkout so it isn't taken from under me mid-payment.
- As a guest, I want to book without creating an account so I can complete a purchase quickly.
- As a customer, I want to create an account so I can view and manage my upcoming bookings.
- As a customer, I want to pay securely via Stripe so I trust the transaction is safe.
- As a customer, I want to receive a confirmation email after booking so I have proof and details of my appointment.
- As a customer, I want to cancel or reschedule a booking so I have flexibility if my plans change.
- As a customer, I want clear error messages if payment fails or a slot becomes unavailable so I understand what happened and what to do next.

**Service Provider (Admin)**

- As a provider, I want to set my available time slots so customers can only book when I'm actually free.
- As a provider, I want to view all upcoming bookings in a dashboard so I can plan my day.
- As a provider, I want to block off unavailable dates (holidays, breaks) so customers can't book those times.
- As a provider, I want to see when a booking is cancelled so I can free up that slot again.
- As a provider, I want basic revenue/booking stats so I can track how my business is performing.

**System (non-functional, framed as stories)**

- As a system, I need to prevent two customers from booking the same slot simultaneously so double-bookings never happen.
- As a system, I need to release a held slot automatically if checkout isn't completed within a time limit (e.g. 5 minutes) so slots don't get stuck in limbo.

---

### Story: Slot temporarily held during checkout

**As a customer, I want a slot to be held while I complete checkout so it isn't taken from under me mid-payment.**

**AC 1 — Slot locks on checkout start**
- Given a slot is available
- When a customer clicks "Book this slot" and enters checkout
- Then the slot is marked as "held" for that customer
- And no other customer can select or book that slot while it's held

**AC 2 — Other customers see it as unavailable**
- Given a slot is currently held by another customer
- When a second customer views the same slot
- Then it appears as "unavailable" or "pending" in real time (within ~1s), not bookable

**AC 3 — Hold converts to confirmed booking on successful payment**
- Given a customer has a slot on hold
- When their Stripe payment succeeds
- Then the slot status changes from "held" to "booked"
- And a confirmation email is sent
- And the slot is permanently removed from availability

**AC 4 — Hold releases on failed/abandoned payment**
- Given a customer has a slot on hold
- When payment fails, or the customer navigates away/closes the tab before completing checkout
- Then the hold is released
- And the slot becomes available to others again

---

### Story: Held slot auto-releases after timeout

**As a system, I need to release a held slot automatically if checkout isn't completed within a time limit so slots don't get stuck in limbo.**

**AC 1 — Timer starts on hold**
- Given a slot enters "held" status
- When the hold is created
- Then a 5-minute countdown starts (server-side, not just client-side, so it can't be bypassed)

**AC 2 — Countdown visible to user**
- Given a customer is in checkout with a held slot
- When time is running out
- Then they see a visible countdown/warning (e.g. "Slot held for 2:14") so they aren't surprised by losing it

**AC 3 — Auto-release on timeout**
- Given a hold reaches 5 minutes with no completed payment
- When the timer expires
- Then the slot status reverts to "available"
- And the customer's checkout session is invalidated, showing a clear message ("This slot is no longer held — please select a new time")

**AC 4 — Race condition: payment completes right at timeout**
- Given a hold is about to expire
- When a payment webhook confirms success at nearly the same moment as the timeout
- Then the system must resolve this deterministically (payment success takes priority if it lands before the release job commits) — this is worth documenting explicitly as a known edge case with your chosen resolution strategy (e.g. database transaction/lock, idempotency key)

