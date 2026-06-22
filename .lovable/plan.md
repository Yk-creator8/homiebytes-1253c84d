All four areas plus notifications is too much for one turn — I'd ship something brittle. Here's the slice plan I'll work through, one phase per turn, verifying before moving on.

## Phase 1 — Roles + Cook (restaurant) dashboard
- Add `cook` and `rider` to the `app_role` enum; admin-only role assignment via `has_role`.
- New route `/_authenticated/cook` with:
  - Menu management (CRUD on `food_items` they own, image upload to `food-images`).
  - Incoming orders list (realtime on `orders` filtered by `cook_id`).
  - Accept / reject / mark preparing / mark ready actions (server fn, RLS-checked).
  - Earnings panel (sum of paid orders, today / 7d / 30d).
- Gate menu writes behind `has_role(uid, 'cook')`.

## Phase 2 — Delivery partner dashboard
- New route `/_authenticated/rider`.
- Rider onboarding (vehicle, phone) on `profiles`.
- Available orders feed (status = ready, no rider assigned) + accept action.
- Active delivery view: pickup → delivered, with Google Maps directions reusing the existing connector.
- Periodic location ping (client → server fn → `orders.rider_lat/lng`), realtime on customer's tracking page.
- Earnings panel.

## Phase 3 — Admin dashboard
- New route `/_authenticated/admin` gated by `has_role(uid, 'admin')`.
- Tabs: Users (assign roles), Orders (search + force-refund), Payouts (paid orders by cook/rider), Webhook events log, Basic metrics (GMV, orders/day, AOV).
- Refund action calls Razorpay Refunds API and writes `payment_status='refunded'`.

## Phase 4 — Customer polish
- Search + filters on `/index` (cuisine, price, rating, distance using existing lat/lng).
- Reviews & ratings (`reviews` table already exists — wire UI + aggregate rating on cards).
- Coupons (`coupons` table, percent/flat, min order, expiry, usage cap) applied at checkout.
- Order history page with reorder.
- In-app notification bell driven by realtime on `orders` + a `notifications` table.

## Phase 5 — Notifications (Email + SMS + in-app)
- Lovable Emails (built-in) for order confirmation, status changes, password reset, welcome.
- Twilio connector for SMS on order placed / out for delivery / delivered.
- In-app realtime bell from Phase 4.

## Technical notes
- All writes via `createServerFn` with `requireSupabaseAuth` + role checks.
- RLS tightened per role on `orders`, `food_items`, new `coupons`/`notifications`.
- Razorpay webhook already live; refund endpoint added in Phase 3.
- No Docker/Nginx/`.env.example` — Lovable runtime.
- No MSG91 / FCM / Cloudinary / PostHog — not in the connector catalog. Supabase Storage covers images; Realtime covers push-like updates in-app.

## Out of scope (won't do)
- Self-hosted VPS deployment files.
- "System Health" page that pings external providers — connectors that aren't installed can't be health-checked, and shipping a green-check page that lies is worse than no page.

Approve and I'll start with **Phase 1 (Cook dashboard)** next turn.