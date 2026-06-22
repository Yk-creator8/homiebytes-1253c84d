import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { LogoWordmark } from "@/components/Logo";
import { Loader2, Mail, Phone, ArrowLeft, Sparkles, RefreshCw } from "lucide-react";
import { z } from "zod";


export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — HomieBytes" }, { name: "description", content: "Sign in to HomieBytes to order homemade food or start your cloud kitchen." }] }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(6, "Min 6 characters").max(72);
const phoneSchema = z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, "Use international format e.g. +9198…");

const RESEND_COOLDOWN_SEC = 45;

type Mode = "email" | "email-otp" | "phone";

/** Map raw Supabase / Twilio auth errors to friendly user-facing text. */
function friendlyOtpError(raw: string | undefined): string {
  const m = (raw ?? "").toLowerCase();
  if (!m) return "Something went wrong. Please try again.";
  if (m.includes("expired") || m.includes("invalid") && m.includes("token")) return "That code is invalid or has expired. Tap Resend for a new one.";
  if (m.includes("invalid") && (m.includes("otp") || m.includes("code"))) return "Incorrect code. Please double-check and try again.";
  if (m.includes("rate") || m.includes("too many") || m.includes("seconds")) return "Too many attempts. Please wait a moment, then resend.";
  if (m.includes("user not found")) return "No account matched that login. We'll create one when you verify.";
  if (m.includes("sms") || m.includes("phone")) return "Couldn't send the SMS. Check your number and try again.";
  if (m.includes("email")) return "Couldn't send the email. Check the address and try again.";
  return raw ?? "Something went wrong.";
}

function AuthPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("email");
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: role === "cook" ? "/cook" : "/", replace: true });
    }
  }, [loading, user, role, navigate]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) { clearInterval(cooldownRef.current); cooldownRef.current = null; }
      return;
    }
    cooldownRef.current = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [cooldown]);

  const startCooldown = () => setCooldown(RESEND_COOLDOWN_SEC);

  const resetOtpFlow = () => {
    setStep("enter");
    setOtp("");
    setOtpError(null);
    setCooldown(0);
  };

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const emailV = emailSchema.parse(email);
      const passwordV = passwordSchema.parse(password);
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email: emailV, password: passwordV,
          options: { data: { full_name: name.trim() || undefined }, emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        trackEvent("sign_up", { method: "email" });
        toast.success("Account created!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: emailV, password: passwordV });
        if (error) throw error;
        trackEvent("sign_in", { method: "email" });
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.issues?.[0]?.message ?? err.message ?? "Something went wrong");
    } finally { setBusy(false); }
  };

  const sendPhoneOtp = async (isResend = false) => {
    setBusy(true); setOtpError(null);
    try {
      const v = phoneSchema.parse(phone);
      const { error } = await supabase.auth.signInWithOtp({ phone: v });
      if (error) throw error;
      toast.success(isResend ? "New code sent" : "OTP sent — check your messages");
      setStep("verify");
      startCooldown();
    } catch (err: any) {
      const msg = err.issues?.[0]?.message ?? friendlyOtpError(err.message);
      toast.error(msg);
      setOtpError(msg);
    } finally { setBusy(false); }
  };

  const handlePhoneStart = async (e: React.FormEvent) => { e.preventDefault(); await sendPhoneOtp(false); };

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setOtpError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: phoneSchema.parse(phone), token: otp.trim(), type: "sms" });
      if (error) throw error;
      trackEvent("sign_in", { method: "phone" });
      toast.success("Signed in!");
    } catch (err: any) {
      const msg = friendlyOtpError(err.message);
      setOtpError(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  const sendEmailOtp = async (isResend = false) => {
    setBusy(true); setOtpError(null);
    try {
      const v = emailSchema.parse(email);
      const { error } = await supabase.auth.signInWithOtp({
        email: v,
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      toast.success(isResend ? "New code sent to your inbox" : "OTP sent — check your inbox");
      setStep("verify");
      startCooldown();
    } catch (err: any) {
      const msg = err.issues?.[0]?.message ?? friendlyOtpError(err.message);
      toast.error(msg);
      setOtpError(msg);
    } finally { setBusy(false); }
  };

  const handleEmailOtpStart = async (e: React.FormEvent) => { e.preventDefault(); await sendEmailOtp(false); };

  const handleEmailOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setOtpError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: emailSchema.parse(email),
        token: otp.trim(),
        type: "email",
      });
      if (error) throw error;
      trackEvent("sign_in", { method: "email_otp" });
      toast.success("Signed in!");
    } catch (err: any) {
      const msg = friendlyOtpError(err.message);
      setOtpError(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  };


  const handleGoogle = async () => {
    setBusy(true);
    trackEvent("sign_in", { method: "google" });
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/` });
    if (r.error) { toast.error(r.error.message || "Google sign-in failed"); setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 animate-fade-in">
      <div className="text-center mb-6">
        <Link to="/" className="inline-flex"><LogoWordmark /></Link>
      </div>

      <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-7 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1.5 w-fit mb-3">
          <Sparkles className="h-3.5 w-3.5" /> New users get 20% off · code CLOUDBITES1
        </div>
        <h1 className="font-display text-2xl font-bold">Welcome to HomieBytes</h1>
        <p className="text-sm text-muted-foreground mt-1">Good food. Anytime. Anywhere.</p>

        {/* Mode tabs */}
        <div className="mt-5 grid grid-cols-3 gap-1 p-1 rounded-xl bg-secondary/60 text-xs font-semibold">
          {([["email", Mail, "Password"], ["email-otp", Mail, "Email OTP"], ["phone", Phone, "Phone"]] as const).map(([m, Icon, label]) => (
            <button key={m} onClick={() => { setMode(m); resetOtpFlow(); }} className={`inline-flex items-center justify-center gap-1.5 h-9 rounded-lg transition ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {mode === "email" && (
          <form onSubmit={handleEmailPassword} className="mt-4 space-y-3 animate-fade-in">
            {isSignup && (
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Full name" className="w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Password" className="w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
            <button disabled={busy} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}{isSignup ? "Create account" : "Sign in"}
            </button>
            <button type="button" onClick={() => setIsSignup(!isSignup)} className="w-full text-sm text-muted-foreground hover:text-foreground">
              {isSignup ? "Have an account? Sign in" : "New here? Create account"}
            </button>
          </form>
        )}

        {mode === "email-otp" && step === "enter" && (
          <form onSubmit={handleEmailOtpStart} className="mt-4 space-y-3 animate-fade-in">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
            <button disabled={busy} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Send OTP to email
            </button>
            <p className="text-[11px] text-muted-foreground text-center">We'll email a 6-digit code. No password needed.</p>
          </form>
        )}

        {mode === "email-otp" && step === "verify" && (
          <form onSubmit={handleEmailOtpVerify} className="mt-4 space-y-3 animate-fade-in">
            <button type="button" onClick={resetOtpFlow} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Use a different email</button>
            <div className="text-sm text-muted-foreground">Enter the 6-digit code sent to <span className="font-semibold text-foreground">{email}</span></div>
            <input value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(null); }} required inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" className={`w-full h-12 text-center text-2xl font-bold tracking-[0.5em] rounded-xl bg-background ring-1 ${otpError ? "ring-destructive" : "ring-border"}`} />
            {otpError && <p className="text-xs text-destructive font-medium">{otpError}</p>}
            <button disabled={busy || otp.length < 6} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Verify & continue
            </button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" disabled={busy || cooldown > 0} onClick={() => sendEmailOtp(true)} className="inline-flex items-center gap-1 font-semibold text-primary disabled:text-muted-foreground disabled:cursor-not-allowed">
                <RefreshCw className="h-3 w-3" /> {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
              <button type="button" onClick={resetOtpFlow} className="text-muted-foreground hover:text-foreground">Start over</button>
            </div>
          </form>
        )}

        {mode === "phone" && step === "enter" && (
          <form onSubmit={handlePhoneStart} className="mt-4 space-y-3 animate-fade-in">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+91 98765 43210" className="w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" />
            <button disabled={busy} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Send SMS code
            </button>
            <p className="text-[11px] text-muted-foreground text-center">We'll text a 6-digit code via Twilio. Free & easy — no password needed.</p>
          </form>
        )}

        {mode === "phone" && step === "verify" && (
          <form onSubmit={handlePhoneVerify} className="mt-4 space-y-3 animate-fade-in">
            <button type="button" onClick={resetOtpFlow} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Use a different number</button>
            <div className="text-sm text-muted-foreground">Enter the 6-digit code sent to <span className="font-semibold text-foreground">{phone}</span></div>
            <input value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(null); }} required inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" className={`w-full h-12 text-center text-2xl font-bold tracking-[0.5em] rounded-xl bg-background ring-1 ${otpError ? "ring-destructive" : "ring-border"}`} />
            {otpError && <p className="text-xs text-destructive font-medium">{otpError}</p>}
            <button disabled={busy || otp.length < 6} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Verify & continue
            </button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" disabled={busy || cooldown > 0} onClick={() => sendPhoneOtp(true)} className="inline-flex items-center gap-1 font-semibold text-primary disabled:text-muted-foreground disabled:cursor-not-allowed">
                <RefreshCw className="h-3 w-3" /> {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend SMS"}
              </button>
              <button type="button" onClick={resetOtpFlow} className="text-muted-foreground hover:text-foreground">Start over</button>
            </div>
          </form>
        )}


        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>

        <button onClick={handleGoogle} disabled={busy} className="w-full h-11 rounded-xl bg-background ring-1 ring-border font-semibold inline-flex items-center justify-center gap-2 hover:bg-secondary disabled:opacity-50">
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
