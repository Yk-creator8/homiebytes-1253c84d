
-- 1) Profiles: prevent self-escalation of privileged columns
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_verified  IS NOT DISTINCT FROM (SELECT p.is_verified  FROM public.profiles p WHERE p.id = auth.uid())
    AND cook_status  IS NOT DISTINCT FROM (SELECT p.cook_status  FROM public.profiles p WHERE p.id = auth.uid())
    AND cook_fee_paid IS NOT DISTINCT FROM (SELECT p.cook_fee_paid FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 2) Coupons: restrict public read to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
REVOKE SELECT ON public.coupons FROM anon;
CREATE POLICY "Authenticated can view active coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 3) Orders: remove the broad rider SELECT branch; expose only safe fields through an RPC
DROP POLICY IF EXISTS orders_select_party ON public.orders;
CREATE POLICY orders_select_party ON public.orders
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR cook_id  = auth.uid()
    OR rider_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.get_available_pickups()
RETURNS TABLE (
  id uuid,
  status order_status,
  total numeric,
  delivery_fee numeric,
  delivery_address text,
  delivery_lat double precision,
  delivery_lng double precision,
  created_at timestamptz,
  cook_id uuid,
  items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id, o.status, o.total, o.delivery_fee,
    o.delivery_address, o.delivery_lat, o.delivery_lng,
    o.created_at, o.cook_id,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('food_name', oi.food_name, 'qty', oi.qty))
      FROM public.order_items oi
      WHERE oi.order_id = o.id
    ), '[]'::jsonb) AS items
  FROM public.orders o
  WHERE o.status = 'ready'
    AND o.rider_id IS NULL
    AND public.has_role(auth.uid(), 'rider'::app_role)
  ORDER BY o.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_available_pickups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_pickups() TO authenticated;

-- 4) User roles: explicit admin-only UPDATE/DELETE + trigger guarding admin role assignment
DROP POLICY IF EXISTS user_roles_admin_update ON public.user_roles;
CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS user_roles_admin_delete ON public.user_roles;
CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS user_roles_admin_insert ON public.user_roles;
CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.prevent_admin_role_self_assign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin'::app_role
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only an existing admin can grant the admin role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admin_role_self_assign ON public.user_roles;
CREATE TRIGGER trg_prevent_admin_role_self_assign
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_role_self_assign();

-- 5) Helper for server-side admin route guard
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role);
$$;
REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
