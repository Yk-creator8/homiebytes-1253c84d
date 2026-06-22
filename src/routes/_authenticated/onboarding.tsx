import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChefHat, Loader2, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";


export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Become a Cook — HomieBytes" }] }),
  component: CookOnboarding,
});

type Step = "personal" | "kitchen" | "submitted";

function CookOnboarding() {
  const { user, profile, role, refresh, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("personal");
  const [busy, setBusy] = useState(false);

  // Form state — prefill from profile/auth where available.
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [kitchenName, setKitchenName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setDob(profile.dob ?? "");
    setPhone(profile.phone ?? "");
    setAddress(profile.address ?? profile.location ?? "");
    setKitchenName(profile.cloud_kitchen_name ?? "");
    setBankName(profile.bank_account_name ?? "");
    setBankAccount(profile.bank_account_number ?? "");
    setBankIfsc(profile.bank_ifsc ?? "");
  }, [profile]);

  // Already an approved cook? Send to dashboard.
  useEffect(() => {
    if (loading) return;
    if (role === "cook" && profile?.cook_status === "approved") {
      navigate({ to: "/cook", replace: true });
    } else if (role === "cook" && profile?.cook_submitted_at) {
      setStep("submitted");
    }
  }, [loading, role, profile?.cook_status, profile?.cook_submitted_at, navigate]);

  const savePersonal = async () => {
    if (!user) return;
    if (!fullName.trim() || !dob || !phone.trim() || !address.trim()) {
      toast.error("Please fill all fields");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: fullName.trim(),
        dob,
        phone: phone.trim(),
        address: address.trim(),
        location: address.trim(),
      }).eq("id", user.id);
      if (error) throw error;
      setStep("kitchen");
    } catch (e: any) {
      toast.error(e.message ?? "Could not save");
    } finally { setBusy(false); }
  };

  const submitApplication = async () => {
    if (!user) return;
    if (!kitchenName.trim() || !bankName.trim() || !bankAccount.trim() || !bankIfsc.trim()) {
      toast.error("Please fill all fields");
      return;
    }
    setBusy(true);
    try {
      const { error: pErr } = await supabase.from("profiles").update({
        cloud_kitchen_name: kitchenName.trim(),
        bank_account_name: bankName.trim(),
        bank_account_number: bankAccount.trim(),
        bank_ifsc: bankIfsc.trim().toUpperCase(),
        cook_status: "pending",
        cook_submitted_at: new Date().toISOString(),
      }).eq("id", user.id);
      if (pErr) throw pErr;

      // Ensure cook role exists (idempotent).
      const { data: existing } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "cook").maybeSingle();
      if (!existing) {
        const { error: rErr } = await supabase.from("user_roles").insert({ user_id: user.id, role: "cook" });
        if (rErr && !/duplicate/i.test(rErr.message)) throw rErr;
      }
      await refresh();
      trackEvent("cook_application_submit", {
        kitchen_name: kitchenName.trim(),
        has_bank_details: true,
      });
      setStep("submitted");
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit");
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div className="py-20 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (step === "submitted") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 animate-fade-in">
        <div className="rounded-3xl bg-card ring-1 ring-border p-8 text-center shadow-[var(--shadow-warm)]">
          <div className="mx-auto h-16 w-16 rounded-full bg-success/15 grid place-items-center text-success">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 font-display text-2xl md:text-3xl font-bold">Application under review</h1>
          <p className="mt-2 text-muted-foreground">Thanks, <span className="font-semibold text-foreground">{fullName || "chef"}</span>! We've received your details and bank info for <span className="font-semibold text-foreground">{kitchenName}</span>. Our team will verify and update you shortly.</p>
          <div className="mt-6 grid gap-2 text-sm">
            <div className="rounded-xl bg-secondary/60 px-4 py-3 text-left"><span className="text-muted-foreground">Status:</span> <span className="font-semibold text-primary">Pending review</span></div>
            <div className="rounded-xl bg-secondary/60 px-4 py-3 text-left"><span className="text-muted-foreground">Updates sent to:</span> <span className="font-semibold inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user?.email}</span></div>
          </div>
          <Link to="/" className="mt-6 inline-flex h-11 px-5 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 animate-fade-in">
      <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8 shadow-[var(--shadow-warm)]">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1.5 w-fit">
          <Sparkles className="h-3.5 w-3.5" /> Become a HomieBytes cook
        </div>
        <h1 className="mt-3 font-display text-2xl md:text-3xl font-bold inline-flex items-center gap-2">
          <ChefHat className="h-7 w-7 text-primary" /> {step === "personal" ? "Your details" : "Kitchen & payouts"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Step {step === "personal" ? "1" : "2"} of 2</p>

        <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: step === "personal" ? "50%" : "100%" }} />
        </div>

        {step === "personal" && (
          <div className="mt-6 space-y-3 animate-fade-in">
            <Field label="Email (from your account)">
              <input value={user?.email ?? ""} disabled className="w-full h-11 rounded-xl bg-secondary/50 ring-1 ring-border px-3 text-sm text-muted-foreground" />
            </Field>
            <Field label="Full name">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} placeholder="As per your ID" className="w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
            </Field>
            <Field label="Date of birth">
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
            </Field>
            <Field label="Mobile number">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="+91 98765 43210" className="w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
            </Field>
            <Field label="Address">
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} maxLength={400} placeholder="House / street / area / city" className="w-full rounded-xl bg-background ring-1 ring-border px-3 py-2 text-sm" />
            </Field>

            <button onClick={savePersonal} disabled={busy} className="mt-2 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        )}

        {step === "kitchen" && (
          <div className="mt-6 space-y-3 animate-fade-in">
            <Field label="Cloud kitchen name">
              <input value={kitchenName} onChange={(e) => setKitchenName(e.target.value)} maxLength={80} placeholder="e.g. Amma's Kitchen" className="w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
            </Field>
            <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank details (for payouts)</div>
            <Field label="Account holder name">
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={100} placeholder="As per bank records" className="w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
            </Field>
            <Field label="Account number">
              <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, "").slice(0, 20))} inputMode="numeric" placeholder="••••••••••" className="w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
            </Field>
            <Field label="IFSC code">
              <input value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase().slice(0, 11))} placeholder="HDFC0001234" className="w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm uppercase" />
            </Field>

            <div className="flex gap-2 mt-2">
              <button onClick={() => setStep("personal")} className="h-11 px-4 rounded-xl ring-1 ring-border font-semibold inline-flex items-center gap-1 hover:bg-secondary"><ArrowLeft className="h-4 w-4" /> Back</button>
              <button onClick={submitApplication} disabled={busy} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for review"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-1">Your bank details are stored securely and used only for payouts.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
