
-- Add payment tracking fields to orders
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

ALTER TABLE public.orders
  ADD COLUMN payment_status public.payment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN payment_provider text NOT NULL DEFAULT 'razorpay',
  ADD COLUMN razorpay_order_id text,
  ADD COLUMN razorpay_payment_id text,
  ADD COLUMN razorpay_signature text,
  ADD COLUMN payment_amount integer,
  ADD COLUMN payment_currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN payment_failure_reason text,
  ADD COLUMN paid_at timestamptz;

CREATE UNIQUE INDEX orders_razorpay_order_id_key ON public.orders(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE INDEX orders_payment_status_idx ON public.orders(payment_status);

-- Webhook event log (idempotency + audit)
CREATE TABLE public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

GRANT SELECT ON public.payment_webhook_events TO authenticated;
GRANT ALL ON public.payment_webhook_events TO service_role;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook events"
  ON public.payment_webhook_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix security finding: recreate public_profiles WITHOUT security definer
-- so it enforces the querying user's RLS, not the view creator's.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
  WITH (security_invoker = true)
  AS
SELECT id, full_name, avatar_url, cloud_kitchen_name, is_verified, location, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
