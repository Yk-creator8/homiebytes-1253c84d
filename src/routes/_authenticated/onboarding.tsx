import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingBag, ChefHat, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Choose your role — Deligo" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user, role, refresh, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"customer" | "cook" | null>(null);
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (!loading && role) navigate({ to: role === "cook" ? "/cook" : "/browse", replace: true });
  }, [loading, role, navigate]);

  const pick = async (chosen: "customer" | "cook") => {
    if (!user) return;
    setBusy(chosen);
    try {
      if (chosen === "cook" && !location.trim()) {
        toast.error("Add your kitchen location first");
        setBusy(null);
        return;
      }
      const { error: rErr } = await supabase.from("user_roles").insert({ user_id: user.id, role: chosen });
      if (rErr) throw rErr;
      if (location.trim()) {
        await supabase.from("profiles").update({ location: location.trim() }).eq("id", user.id);
      }
      await refresh();
      toast.success(`Welcome, ${chosen === "cook" ? "Chef" : "Foodie"}!`);
      navigate({ to: chosen === "cook" ? "/cook" : "/browse", replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Could not save role");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl md:text-4xl font-bold text-center">How will you use Deligo?</h1>
      <p className="text-center text-muted-foreground mt-2">Choose your role. You can come back to switch by contacting support.</p>

      <div className="mt-6">
        <label className="text-xs font-semibold text-muted-foreground">Your area / locality</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Koramangala, Bengaluru" maxLength={120} className="mt-1 w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <button
          onClick={() => pick("customer")}
          disabled={!!busy}
          className="text-left rounded-3xl bg-card ring-1 ring-border p-6 hover:ring-primary hover:shadow-[var(--shadow-warm)] transition disabled:opacity-50"
        >
          <div className="h-12 w-12 rounded-2xl bg-primary/15 inline-flex items-center justify-center text-primary">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">I'm a Customer</h2>
          <p className="mt-1 text-sm text-muted-foreground">Order fresh homemade meals from cooks near you.</p>
          <div className="mt-4 inline-flex items-center text-sm font-semibold text-primary">
            {busy === "customer" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start ordering →"}
          </div>
        </button>

        <button
          onClick={() => pick("cook")}
          disabled={!!busy}
          className="text-left rounded-3xl p-6 text-primary-foreground hover:shadow-[var(--shadow-warm)] transition disabled:opacity-50"
          style={{ background: "var(--gradient-warm)" }}
        >
          <div className="h-12 w-12 rounded-2xl bg-white/20 inline-flex items-center justify-center">
            <ChefHat className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">I'm a Home Cook</h2>
          <p className="mt-1 text-sm opacity-90">Share your cooking with neighbours and earn from your kitchen.</p>
          <div className="mt-4 inline-flex items-center text-sm font-semibold">
            {busy === "cook" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Open my kitchen →"}
          </div>
        </button>
      </div>
    </div>
  );
}
