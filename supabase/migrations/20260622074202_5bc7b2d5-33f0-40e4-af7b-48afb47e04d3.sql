-- Allow self-assignment of rider role (in addition to existing customer/cook)
DROP POLICY IF EXISTS "user_roles_insert_self" ON public.user_roles;
CREATE POLICY "user_roles_insert_self"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = ANY (ARRAY['customer'::app_role, 'cook'::app_role, 'rider'::app_role])
  );

-- Rider fields on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rider_lat double precision,
  ADD COLUMN IF NOT EXISTS rider_lng double precision,
  ADD COLUMN IF NOT EXISTS rider_location_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_rider_idx ON public.orders(rider_id);
CREATE INDEX IF NOT EXISTS orders_ready_unassigned_idx
  ON public.orders(status) WHERE status = 'ready' AND rider_id IS NULL;

-- Rider profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vehicle_type text,
  ADD COLUMN IF NOT EXISTS vehicle_number text,
  ADD COLUMN IF NOT EXISTS is_rider_active boolean NOT NULL DEFAULT false;

-- Riders can see unclaimed ready orders + orders assigned to them
DROP POLICY IF EXISTS "orders_select_party" ON public.orders;
CREATE POLICY "orders_select_party"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR cook_id = auth.uid()
    OR rider_id = auth.uid()
    OR (
      public.has_role(auth.uid(), 'rider'::public.app_role)
      AND status = 'ready'
      AND rider_id IS NULL
      AND payment_status IN ('paid'::public.payment_status, 'pending'::public.payment_status)
    )
  );

-- Riders can claim a ready/unassigned order, then update status/location on their own orders
DROP POLICY IF EXISTS "orders_update_rider" ON public.orders;
CREATE POLICY "orders_update_rider"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'rider'::public.app_role)
    AND (
      rider_id = auth.uid()
      OR (status = 'ready' AND rider_id IS NULL)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'rider'::public.app_role)
    AND rider_id = auth.uid()
  );