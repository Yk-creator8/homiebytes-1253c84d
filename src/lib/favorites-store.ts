import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

let cache: Set<string> | null = null;
const subs = new Set<() => void>();

async function load(userId: string) {
  const { data } = await supabase.from("favorites").select("food_id").eq("user_id", userId);
  cache = new Set((data ?? []).map((d) => d.food_id));
  subs.forEach((s) => s());
}

export function useFavorites() {
  const { user } = useAuth();
  const [, force] = useState(0);

  useEffect(() => {
    if (!user) { cache = null; force((n) => n + 1); return; }
    if (!cache) load(user.id);
    const sub = () => force((n) => n + 1);
    subs.add(sub);
    return () => { subs.delete(sub); };
  }, [user]);

  const has = useCallback((foodId: string) => !!cache?.has(foodId), []);

  const toggle = useCallback(async (foodId: string) => {
    if (!user) { toast.error("Sign in to save favorites"); return; }
    if (!cache) cache = new Set();
    if (cache.has(foodId)) {
      cache.delete(foodId);
      subs.forEach((s) => s());
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("food_id", foodId);
    } else {
      cache.add(foodId);
      subs.forEach((s) => s());
      await supabase.from("favorites").insert({ user_id: user.id, food_id: foodId });
      toast.success("Saved to favorites");
    }
  }, [user]);

  return { has, toggle, ids: cache ? [...cache] : [] };
}
