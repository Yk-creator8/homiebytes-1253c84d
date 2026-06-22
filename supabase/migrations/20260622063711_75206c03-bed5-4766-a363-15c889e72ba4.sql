-- Fix privilege escalation on user_roles: restrict self-assignment to safe roles only.
DROP POLICY IF EXISTS "user_roles_insert_self" ON public.user_roles;
CREATE POLICY "user_roles_insert_self" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role IN ('customer', 'cook')
  );

-- Fix sensitive profile data exposure: remove public read-all and expose only non-sensitive fields via a view.
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- Own profile: full read for authenticated users.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admin: full read of all profiles.
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public-safe view for cook discovery and public listings.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
  SELECT
    id,
    full_name,
    avatar_url,
    cloud_kitchen_name,
    is_verified,
    location,
    created_at
  FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Realtime authorization: lock down realtime.messages channel subscriptions.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime_orders_customer_channel" ON realtime.messages;
CREATE POLICY "realtime_orders_customer_channel" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    topic = 'orders-customer'
    AND EXISTS (SELECT 1 FROM public.orders WHERE customer_id = auth.uid())
  );

DROP POLICY IF EXISTS "realtime_orders_cook_channel" ON realtime.messages;
CREATE POLICY "realtime_orders_cook_channel" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    topic = 'cook-orders-rt'
    AND EXISTS (SELECT 1 FROM public.orders WHERE cook_id = auth.uid())
  );