import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

export type AppRole = "customer" | "cook" | "admin" | "rider";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  cook_fee_paid: boolean;
  cook_fee_paid_at: string | null;
  first_order_coupon_used: boolean;
  lat: number | null;
  lng: number | null;
  dob: string | null;
  address: string | null;
  cloud_kitchen_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  cook_status: "pending" | "approved" | "rejected";
  cook_submitted_at: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  is_rider_active: boolean;
};

type AuthCtx = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  loading: true,
  session: null,
  user: null,
  profile: null,
  role: null,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const qc = useQueryClient();

  const loadUserMeta = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
    ]);
    setProfile(p as Profile | null);
    setRole((r?.role as AppRole | undefined) ?? null);
  };

  const refresh = async () => {
    if (session?.user) await loadUserMeta(session.user.id);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setRole(null);
        qc.clear();
        router.invalidate();
        return;
      }
      if (s?.user) {
        setTimeout(() => {
          loadUserMeta(s.user.id);
        }, 0);
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        router.invalidate();
        qc.invalidateQueries();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadUserMeta(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ loading, session, user: session?.user ?? null, profile, role, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
