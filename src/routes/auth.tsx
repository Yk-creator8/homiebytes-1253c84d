import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { LogoWordmark } from "@/components/Logo";
import { Loader2 } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Deligo" }, { name: "description", content: "Sign in to Deligo to order homemade food or start cooking for your neighbours." }] }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(6, "Min 6 characters").max(72);
const nameSchema = z.string().trim().min(1).max(100);

function AuthPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: role ? (role === "cook" ? "/cook" : "/browse") : "/onboarding", replace: true });
    }
  }, [loading, user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const emailV = emailSchema.parse(email);
      const passwordV = passwordSchema.parse(password);
      if (mode === "signup") {
        const nameV = nameSchema.parse(name);
        const { error } = await supabase.auth.signUp({
          email: emailV,
          password: passwordV,
          options: { data: { full_name: nameV }, emailRedirectTo: `${window.location.origin}/onboarding` },
        });
        if (error) throw error;
        toast.success("Account created! Choose your role next.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: emailV, password: passwordV });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.issues?.[0]?.message ?? err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/onboarding` });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="text-center mb-8">
        <Link to="/" className="inline-flex"><LogoWordmark /></Link>
      </div>
      <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8 shadow-[var(--shadow-card)]">
        <h1 className="font-display text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{mode === "signin" ? "Sign in to order or cook." : "Join Deligo in seconds."}</p>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="mt-6 w-full h-11 rounded-xl bg-background ring-1 ring-border font-semibold inline-flex items-center justify-center gap-2 hover:bg-secondary disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className="mt-1 w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" placeholder="Anita Sharma" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} className="mt-1 w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={72} className="mt-1 w-full h-11 rounded-xl bg-background ring-1 ring-border px-3 text-sm" placeholder="••••••••" />
          </div>
          <button disabled={busy} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-warm)] inline-flex items-center justify-center gap-2 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground">
          {mode === "signin" ? "New to Deligo? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
