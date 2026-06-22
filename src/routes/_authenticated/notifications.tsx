import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Bell, Mail, MessageSquare, Loader2, Moon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notification settings — HomieBytes" }] }),
  component: NotificationSettings,
});

type Channel = "email" | "sms";
type EventKey = "placed" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "rejected";

const EVENTS: { key: EventKey; label: string; help: string }[] = [
  { key: "placed", label: "Order placed", help: "We confirm your order is in." },
  { key: "accepted", label: "Cook accepted", help: "Your cook is starting." },
  { key: "preparing", label: "Cooking", help: "Food is being prepared." },
  { key: "ready", label: "Ready for pickup", help: "A rider can grab it now." },
  { key: "out_for_delivery", label: "Out for delivery", help: "On the way to you." },
  { key: "delivered", label: "Delivered", help: "Order completed." },
  { key: "rejected", label: "Cancelled / rejected", help: "Something went wrong." },
];

type Prefs = {
  email_enabled: boolean;
  sms_enabled: boolean;
  events: Record<string, Channel[]>;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
};

const DEFAULTS: Prefs = {
  email_enabled: true,
  sms_enabled: false,
  events: {
    placed: ["email"], accepted: ["email"], preparing: ["email"], ready: ["email"],
    out_for_delivery: ["email", "sms"], delivered: ["email"], rejected: ["email"],
  },
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
  timezone: "Asia/Kolkata",
};

function NotificationSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["notification-prefs", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", uid!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    if (data) {
      setPrefs({
        email_enabled: data.email_enabled,
        sms_enabled: data.sms_enabled,
        events: (data.events as Record<string, Channel[]>) ?? DEFAULTS.events,
        quiet_hours_enabled: data.quiet_hours_enabled,
        quiet_hours_start: (data.quiet_hours_start as string)?.slice(0, 5) ?? "22:00",
        quiet_hours_end: (data.quiet_hours_end as string)?.slice(0, 5) ?? "07:00",
        timezone: data.timezone ?? "Asia/Kolkata",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase.from("notification_preferences").upsert({
        user_id: uid,
        email_enabled: prefs.email_enabled,
        sms_enabled: prefs.sms_enabled,
        events: prefs.events,
        quiet_hours_enabled: prefs.quiet_hours_enabled,
        quiet_hours_start: prefs.quiet_hours_start,
        quiet_hours_end: prefs.quiet_hours_end,
        timezone: prefs.timezone,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferences saved");
      qc.invalidateQueries({ queryKey: ["notification-prefs", uid] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  const toggleChannel = (event: EventKey, ch: Channel) => {
    setPrefs((p) => {
      const cur = new Set(p.events[event] ?? []);
      cur.has(ch) ? cur.delete(ch) : cur.add(ch);
      return { ...p, events: { ...p.events, [event]: Array.from(cur) as Channel[] } };
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6 animate-fade-in">
      <header>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1.5">
          <Bell className="h-3.5 w-3.5" /> Notification settings
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">How should we reach you?</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose which channels to use for each order event, and set quiet hours when we shouldn't text or email you.</p>
      </header>

      {/* Master channel toggles */}
      <section className="rounded-2xl bg-card ring-1 ring-border p-5 space-y-3">
        <h2 className="font-semibold text-lg">Channels</h2>
        <label className="flex items-center justify-between gap-3 py-2">
          <span className="inline-flex items-center gap-3"><Mail className="h-5 w-5 text-primary" /><span><div className="font-medium">Email</div><div className="text-xs text-muted-foreground">{user?.email}</div></span></span>
          <input type="checkbox" checked={prefs.email_enabled} onChange={(e) => setPrefs({ ...prefs, email_enabled: e.target.checked })} className="h-5 w-5 accent-primary" />
        </label>
        <label className="flex items-center justify-between gap-3 py-2">
          <span className="inline-flex items-center gap-3"><MessageSquare className="h-5 w-5 text-primary" /><span><div className="font-medium">SMS via Twilio</div><div className="text-xs text-muted-foreground">Text messages to your phone</div></span></span>
          <input type="checkbox" checked={prefs.sms_enabled} onChange={(e) => setPrefs({ ...prefs, sms_enabled: e.target.checked })} className="h-5 w-5 accent-primary" />
        </label>
      </section>

      {/* Per-event matrix */}
      <section className="rounded-2xl bg-card ring-1 ring-border p-5">
        <h2 className="font-semibold text-lg mb-3">Per-event preferences</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-2 text-[11px] uppercase font-semibold text-muted-foreground">
            <div>Event</div><div className="w-12 text-center">Email</div><div className="w-12 text-center">SMS</div>
          </div>
          {EVENTS.map((ev) => {
            const channels = prefs.events[ev.key] ?? [];
            const emailOn = channels.includes("email") && prefs.email_enabled;
            const smsOn = channels.includes("sms") && prefs.sms_enabled;
            return (
              <div key={ev.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-2 py-3 rounded-lg hover:bg-secondary/50">
                <div>
                  <div className="font-medium text-sm">{ev.label}</div>
                  <div className="text-xs text-muted-foreground">{ev.help}</div>
                </div>
                <input type="checkbox" disabled={!prefs.email_enabled} checked={emailOn} onChange={() => toggleChannel(ev.key, "email")} className="h-5 w-5 accent-primary justify-self-center disabled:opacity-30" />
                <input type="checkbox" disabled={!prefs.sms_enabled} checked={smsOn} onChange={() => toggleChannel(ev.key, "sms")} className="h-5 w-5 accent-primary justify-self-center disabled:opacity-30" />
              </div>
            );
          })}
        </div>
      </section>

      {/* Quiet hours */}
      <section className="rounded-2xl bg-card ring-1 ring-border p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-lg inline-flex items-center gap-2"><Moon className="h-5 w-5 text-primary" /> Quiet hours</h2>
          <input type="checkbox" checked={prefs.quiet_hours_enabled} onChange={(e) => setPrefs({ ...prefs, quiet_hours_enabled: e.target.checked })} className="h-5 w-5 accent-primary" />
        </div>
        <p className="text-xs text-muted-foreground">During quiet hours we'll still create in-app notifications, but we won't email or text you. Sleep tight.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">From</span>
            <input type="time" disabled={!prefs.quiet_hours_enabled} value={prefs.quiet_hours_start} onChange={(e) => setPrefs({ ...prefs, quiet_hours_start: e.target.value })} className="mt-1 w-full h-10 rounded-lg bg-background ring-1 ring-border px-3 text-sm disabled:opacity-50" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Until</span>
            <input type="time" disabled={!prefs.quiet_hours_enabled} value={prefs.quiet_hours_end} onChange={(e) => setPrefs({ ...prefs, quiet_hours_end: e.target.value })} className="mt-1 w-full h-10 rounded-lg bg-background ring-1 ring-border px-3 text-sm disabled:opacity-50" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Timezone</span>
          <input type="text" disabled={!prefs.quiet_hours_enabled} value={prefs.timezone} onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })} placeholder="Asia/Kolkata" className="mt-1 w-full h-10 rounded-lg bg-background ring-1 ring-border px-3 text-sm disabled:opacity-50" />
        </label>
      </section>

      <div className="sticky bottom-4 z-10">
        <button
          disabled={save.isPending}
          onClick={() => save.mutate()}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 shadow-lg hover:opacity-95 disabled:opacity-60"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save preferences
        </button>
      </div>
    </div>
  );
}
