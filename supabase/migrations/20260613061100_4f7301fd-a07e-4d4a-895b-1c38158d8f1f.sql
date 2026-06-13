
-- Roles
CREATE TYPE public.app_role AS ENUM ('customer','cook');
CREATE TYPE public.order_status AS ENUM ('placed','preparing','ready','out_for_delivery','delivered','rejected');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  location text,
  avatar_url text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_roles_insert_self" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Food items
CREATE TABLE public.food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cook_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  image_url text,
  is_veg boolean NOT NULL DEFAULT true,
  availability text NOT NULL DEFAULT 'both' CHECK (availability IN ('lunch','dinner','both')),
  is_available boolean NOT NULL DEFAULT true,
  rating numeric(2,1) NOT NULL DEFAULT 4.5,
  prep_minutes integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.food_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.food_items TO authenticated;
GRANT ALL ON public.food_items TO service_role;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food_items_select_all" ON public.food_items FOR SELECT USING (true);
CREATE POLICY "food_items_cook_insert" ON public.food_items FOR INSERT TO authenticated WITH CHECK (cook_id = auth.uid() AND public.has_role(auth.uid(),'cook'));
CREATE POLICY "food_items_cook_update" ON public.food_items FOR UPDATE TO authenticated USING (cook_id = auth.uid());
CREATE POLICY "food_items_cook_delete" ON public.food_items FOR DELETE TO authenticated USING (cook_id = auth.uid());
CREATE INDEX food_items_cook_id_idx ON public.food_items(cook_id);

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cook_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total numeric(10,2) NOT NULL,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 25,
  status public.order_status NOT NULL DEFAULT 'placed',
  delivery_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_party" ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid() OR cook_id = auth.uid());
CREATE POLICY "orders_insert_customer" ON public.orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid() AND public.has_role(auth.uid(),'customer'));
CREATE POLICY "orders_update_cook" ON public.orders FOR UPDATE TO authenticated USING (cook_id = auth.uid() AND public.has_role(auth.uid(),'cook'));
CREATE INDEX orders_customer_idx ON public.orders(customer_id);
CREATE INDEX orders_cook_idx ON public.orders(cook_id);

-- Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  food_id uuid REFERENCES public.food_items(id) ON DELETE SET NULL,
  food_name text NOT NULL,
  food_image text,
  unit_price numeric(10,2) NOT NULL,
  qty integer NOT NULL CHECK (qty > 0)
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select_party" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR o.cook_id = auth.uid()))
);
CREATE POLICY "order_items_insert_customer" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_items;
