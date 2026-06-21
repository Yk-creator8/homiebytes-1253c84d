import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingBag, ChefHat, Loader2, IndianRupee, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CookFeeCheckout } from "@/components/CookFeeCheckout";
import { COOK_JOINING_FEE_INR } from "@/lib/cook-fee.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Get started — HomieBytes" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user, role, profile, refresh, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"customer" | "cook" | null>(null);
  const [location, setLocation] = useState("");
  const [step, setStep] = useState<"choose" | "fee">("choose");

  useEffect(() => {
    if (!loading && role) {
      if (role === "cook" && !profile?.cook_fee_paid) { setStep("fee"); return; }
      navigate({ to: role === "cook" ? "/cook" : "/browse", replace: true });
    }
  }, [loading, role, profile?.cook_fee_paid, navigate]);

  const pickCustomer = async () => {
    if (!user) return;
    setBusy("customer");
    try {
      const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "customer" });
      if (error) throw error;
      if (location.trim()) await supabase.from("profiles").update({ location: location.trim() }).eq("id", user.id);
      await refresh();
      toast.success("Welcome to HomieBytes!");
      navigate({ to: "/browse", replace: true });
    } catch (e: any) { toast.error(e.message ?? "Could not save role"); }
    finally { setBusy(null); }
  };

  const pickCook = async () => {
    if (!user) return;
    if (!location.trim()) { toast.error("Add your kitchen location first"); return; }
    setBusy("cook");
    try {
      const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "cook" });
      if (error) throw error;
      await supabase.from("profiles").update({ location: location.trim() }).eq("id", user.id);
      await refresh();
      setStep("fee");
    } catch (e: any) { toast.error(e.message ?? "Could not save role"); }
    finally { setBusy(null); }
  };

  if (step === "fee") {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 animate-fade-in">
        <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8 shadow-[var(--shadow-warm)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> One-time onboarding
          </div>
          <h1 className="mt-3 font-display text-2xl md:text-3xl font-bold">Open your cloud kitchen</h1>
          <p className="mt-2 text-muted-foreground text-sm">A one-time joining fee of <span className="font-bold text-foreground inline-flex items-center"><IndianRupee className="h-3.5 w-3.5" />{COOK_JOINING_FEE_INR}</span> covers your verification, profile setup, and lifetime access to the HomieBytes cook dashboard.</p>

          <ul className="mt-4 space-y-2 text-sm">
            {["Verified cook badge after onboarding", "Unlimited menu items & order tracking", "Direct customer payments (COD / UPI)"].map((t) => (
              <li key={t} className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-success mt-0.5" /> {t}</li>
            ))}
          </ul>

          <div className="mt-6">
            <CookFeeCheckout onPaid={() => navigate({ to: "/cook", replace: true })} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 animate-fade-in">
      <h1 className="font-display text-3xl md:text-4xl font-bold text-center">How will you use HomieBytes?</h1>
      <p className="text-center text-muted-foreground mt-2">Good food. Anytime. Anywhere.</p>

      <div className="mt-6">
        <label className="text-xs font-semibold text-muted-foreground">Your area / locality</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Koramangala, Bengaluru" maxLength={120} className="mt-1 w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <button onClick={pickCustomer} disabled={!!busy} className="text-left rounded-3xl bg-card ring-1 ring-border p-6 hover:ring-primary hover:shadow-[var(--shadow-warm)] hover:-translate-y-1 transition disabled:opacity-50">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 inline-flex items-center justify-center text-primary"><ShoppingBag className="h-6 w-6" /></div>
          <h2 className="mt-4 font-display text-xl font-bold">I'm a Customer</h2>
          <p className="mt-1 text-sm text-muted-foreground">Order fresh homemade meals from cooks near you.</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/15 text-success px-2.5 py-1 text-[11px] font-bold"><Sparkles className="h-3 w-3" /> 20% off first order</div>
          <div className="mt-3 inline-flex items-center text-sm font-semibold text-primary">
            {busy === "customer" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start ordering →"}
          </div>
        </button>

        <button onClick={pickCook} disabled={!!busy} className="text-left rounded-3xl p-6 text-primary-foreground hover:shadow-[var(--shadow-warm)] hover:-translate-y-1 transition disabled:opacity-50" style={{ background: "var(--gradient-warm)" }}>
          <div className="h-12 w-12 rounded-2xl bg-white/20 inline-flex items-center justify-center"><ChefHat className="h-6 w-6" /></div>
          <h2 className="mt-4 font-display text-xl font-bold">I'm a Home Cook</h2>
          <p className="mt-1 text-sm opacity-90">Run a cloud kitchen. We bring you neighbours hungry for homemade food.</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold"><IndianRupee className="h-3 w-3" />{COOK_JOINING_FEE_INR} one-time joining fee</div>
          <div className="mt-3 inline-flex items-center text-sm font-semibold">
            {busy === "cook" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Open my kitchen →"}
          </div>
        </button>
      </div>
    </div>
  );
}
