import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bike, Loader2, MapPin, Phone, IndianRupee, Package, CheckCircle2, Navigation,
  PlayCircle, PauseCircle, ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { notifyOrderStatusChange } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/rider")({
  head: () => ({ meta: [{ title: "Delivery dashboard — HomieBytes" }] }),
  component: RiderDashboard,
});

type Status = "placed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "rejected";

type OrderRow = {
  id: string;
  status: Status;
  total: number;
  delivery_fee: number;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  created_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  customer_id: string | null;
  cook_id: string;
  rider_id: string | null;
  order_items: { food_name: string; qty: number }[];
};

function RiderDashboard() {
  const { user, profile, role, loading: authLoading, refresh } = useAuth();
  const qc = useQueryClient();

  if (authLoading) {
    return <div className="py-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // Not a rider yet → onboarding card
  if (role !== "rider") {
    return <RiderJoin onJoined={refresh} canSwitch={!!user} currentRole={role} />;
  }

  // Vehicle info gate
  if (!profile?.vehicle_type || !profile?.vehicle_number || !profile?.phone) {
    return <RiderVehicleForm profile={profile} userId={user!.id} onSaved={refresh} />;
  }

  return <RiderHome user={user!} profile={profile} qc={qc} />;
}

/* ---------------- Join as rider ---------------- */

function RiderJoin({ onJoined, canSwitch, currentRole }: { onJoined: () => void; canSwitch: boolean; currentRole: string | null }) {
  const [busy, setBusy] = useState(false);

  const join = async () => {
    if (!canSwitch) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in first");
      // Replace any existing role (single role per user in this app)
      await supabase.from("user_roles").delete().eq("user_id", u.user.id);
      const { error } = await supabase.from("user_roles").insert({ user_id: u.user.id, role: "rider" });
      if (error) throw error;
      toast.success("Welcome aboard, partner!");
      await onJoined();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not switch role");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10 animate-fade-in">
      <div className="rounded-3xl p-6 md:p-8 text-primary-foreground shadow-[var(--shadow-warm)]" style={{ background: "var(--gradient-warm)" }}>
        <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur">
          <Bike className="h-3.5 w-3.5" /> Delivery partner
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold">Earn on your schedule</h1>
        <p className="mt-2 opacity-90 text-sm">Pick up ready orders from home cooks near you, deliver to customers, keep the delivery fee.</p>
      </div>

      <div className="mt-6 rounded-3xl bg-card ring-1 ring-border p-6">
        <h2 className="font-display text-lg font-semibold">How it works</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2"><Package className="h-4 w-4 mt-0.5 text-primary shrink-0" /> Browse ready-to-pickup orders.</li>
          <li className="flex gap-2"><Navigation className="h-4 w-4 mt-0.5 text-primary shrink-0" /> Pick one and follow the route to the cook, then to the customer.</li>
          <li className="flex gap-2"><IndianRupee className="h-4 w-4 mt-0.5 text-primary shrink-0" /> Earn the full delivery fee on every completed drop.</li>
        </ul>

        {currentRole && currentRole !== "rider" && (
          <p className="mt-4 rounded-xl bg-warning/10 text-foreground p-3 text-xs">
            You're currently signed up as <strong className="capitalize">{currentRole}</strong>. Switching to rider will replace that role.
          </p>
        )}

        <button onClick={join} disabled={busy || !canSwitch} className="mt-5 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bike className="h-4 w-4" />}
          Become a delivery partner
        </button>

        <Link to="/" className="mt-3 block text-center text-xs text-muted-foreground hover:underline">Not now, take me home</Link>
      </div>
    </div>
  );
}

/* ---------------- Vehicle form ---------------- */

function RiderVehicleForm({ profile, userId, onSaved }: { profile: any; userId: string; onSaved: () => void }) {
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [vehicleType, setVehicleType] = useState<string>(profile?.vehicle_type ?? "bike");
  const [vehicleNumber, setVehicleNumber] = useState(profile?.vehicle_number ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!phone.trim() || !vehicleNumber.trim()) {
      toast.error("Phone and vehicle number are required");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({
        phone: phone.trim().slice(0, 20),
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber.trim().toUpperCase().slice(0, 20),
      }).eq("id", userId);
      if (error) throw error;
      toast.success("Profile saved");
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 animate-fade-in">
      <div className="rounded-3xl bg-card ring-1 ring-border p-6 shadow-[var(--shadow-warm)]">
        <h1 className="font-display text-2xl font-bold">Almost there</h1>
        <p className="mt-1 text-sm text-muted-foreground">A few details so cooks and customers can reach you.</p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxxxxxxx" className="mt-1 w-full rounded-xl bg-background ring-1 ring-border px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Vehicle</label>
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="mt-1 w-full rounded-xl bg-background ring-1 ring-border px-3 py-2.5 text-sm">
              <option value="bicycle">Bicycle</option>
              <option value="bike">Bike / Scooter</option>
              <option value="car">Car</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Vehicle number</label>
            <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="MH12 AB 1234" className="mt-1 w-full rounded-xl bg-background ring-1 ring-border px-3 py-2.5 text-sm uppercase" />
          </div>
        </div>

        <button onClick={save} disabled={busy} className="mt-5 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save and continue"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Main dashboard ---------------- */

function RiderHome({ user, profile, qc }: { user: { id: string }; profile: any; qc: ReturnType<typeof useQueryClient> }) {
  const [onDuty, setOnDuty] = useState<boolean>(!!profile?.is_rider_active);

  // Available unclaimed orders
  const availableQ = useQuery({
    queryKey: ["rider-available"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_available_pickups");
      if (error) throw error;
      return (data ?? []).map((o: any) => ({
        ...o,
        total: Number(o.total),
        delivery_fee: Number(o.delivery_fee),
        customer_id: null,
        rider_id: null,
        picked_up_at: null,
        delivered_at: null,
        order_items: Array.isArray(o.items) ? o.items : [],
      })) as OrderRow[];
    },
    refetchInterval: onDuty ? 15000 : false,
    enabled: onDuty,
  });

  // My active + history
  const mineQ = useQuery({
    queryKey: ["rider-mine", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,status,total,delivery_fee,delivery_address,delivery_lat,delivery_lng,created_at,customer_id,cook_id,rider_id,picked_up_at,delivered_at,order_items(food_name,qty)")
        .eq("rider_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((o) => ({ ...o, total: Number(o.total), delivery_fee: Number(o.delivery_fee) })) as OrderRow[];
    },
  });

  // Realtime: invalidate on changes that affect rider feeds
  useEffect(() => {
    const ch = supabase
      .channel("rider-orders-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["rider-available"] });
        qc.invalidateQueries({ queryKey: ["rider-mine", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user.id, qc]);

  const toggleDuty = async () => {
    const next = !onDuty;
    setOnDuty(next);
    await supabase.from("profiles").update({ is_rider_active: next }).eq("id", user.id);
  };

  const claim = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ rider_id: user.id, status: "out_for_delivery" })
      .eq("id", orderId)
      .eq("status", "ready")
      .is("rider_id", null);
    if (error) return toast.error(error.message);
    toast.success("Order claimed — head to the kitchen!");
    notifyOrderStatusChange({ data: { orderId, status: "out_for_delivery" } }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["rider-available"] });
    qc.invalidateQueries({ queryKey: ["rider-mine", user.id] });
  };

  const markPickedUp = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ picked_up_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success("Picked up");
    qc.invalidateQueries({ queryKey: ["rider-mine", user.id] });
  };

  const markDelivered = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success("Delivered! 🎉");
    notifyOrderStatusChange({ data: { orderId, status: "delivered" } }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["rider-mine", user.id] });
  };

  // Periodic location ping while on duty AND has an active order
  const mine = mineQ.data ?? [];
  const active = useMemo(() => mine.filter((o) => o.status === "out_for_delivery"), [mine]);

  useEffect(() => {
    if (!onDuty || active.length === 0) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let cancelled = false;
    const send = (lat: number, lng: number) => {
      const ts = new Date().toISOString();
      for (const o of active) {
        supabase.from("orders").update({
          rider_lat: lat, rider_lng: lng, rider_location_updated_at: ts,
        }).eq("id", o.id).then(() => {});
      }
    };

    const tick = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => { if (!cancelled) send(pos.coords.latitude, pos.coords.longitude); },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 },
      );
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [onDuty, active]);

  // Earnings
  const delivered = mine.filter((o) => o.status === "delivered");
  const totalEarnings = delivered.reduce((s, o) => s + o.delivery_fee, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayEarnings = delivered.filter((o) => new Date(o.delivered_at ?? o.created_at) >= today).reduce((s, o) => s + o.delivery_fee, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="rounded-3xl p-6 md:p-8 text-primary-foreground shadow-[var(--shadow-warm)]" style={{ background: "var(--gradient-warm)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Bike className="h-3.5 w-3.5" /> Delivery partner
            </div>
            <h1 className="mt-2 font-display text-2xl md:text-3xl font-bold truncate">{profile?.full_name || "Rider"}</h1>
            <p className="opacity-90 text-sm capitalize">{profile.vehicle_type} · {profile.vehicle_number}</p>
          </div>
          <button onClick={toggleDuty} className={`shrink-0 h-11 rounded-xl px-4 inline-flex items-center gap-2 font-semibold text-sm ${onDuty ? "bg-white text-foreground" : "bg-white/15 backdrop-blur"}`}>
            {onDuty ? <><PauseCircle className="h-4 w-4" /> On duty</> : <><PlayCircle className="h-4 w-4" /> Go online</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat icon={IndianRupee} label="Today" value={`₹${todayEarnings}`} />
        <Stat icon={Package} label="Active" value={String(active.length)} />
        <Stat icon={CheckCircle2} label="Total earnings" value={`₹${totalEarnings}`} />
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <section className="rounded-2xl bg-card ring-1 ring-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Available pickups</h2>
            {availableQ.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          {!onDuty ? (
            <div className="text-sm text-muted-foreground py-8 text-center">You're off duty. Go online to see available orders.</div>
          ) : (availableQ.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No ready orders right now. We'll refresh every 15s.</div>
          ) : (
            <div className="space-y-2">
              {(availableQ.data ?? []).map((o) => <AvailableCard key={o.id} order={o} onClaim={() => claim(o.id)} />)}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-card ring-1 ring-border p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Your deliveries</h2>
          {mineQ.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : mine.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No deliveries yet. Claim one from the left!</div>
          ) : (
            <div className="space-y-2">
              {mine.map((o) => <MineCard key={o.id} order={o} onPickedUp={() => markPickedUp(o.id)} onDelivered={() => markDelivered(o.id)} />)}
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground inline-flex items-center justify-center gap-1.5 w-full">
        <ClipboardList className="h-3.5 w-3.5" /> Location pings while you have an active drop help customers track you.
      </p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-border p-4">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-2 text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function AvailableCard({ order, onClaim }: { order: OrderRow; onClaim: () => void }) {
  return (
    <div className="rounded-xl ring-1 ring-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">#{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="font-medium text-sm">{order.order_items.map((i) => `${i.qty}× ${i.food_name}`).join(", ")}</div>
          {order.delivery_address && <div className="text-xs text-muted-foreground mt-1 flex items-start gap-1"><MapPin className="h-3 w-3 mt-0.5 shrink-0" /><span className="truncate">{order.delivery_address}</span></div>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] text-muted-foreground">Earn</div>
          <div className="font-bold text-primary">₹{order.delivery_fee}</div>
        </div>
      </div>
      <button onClick={onClaim} className="mt-3 w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Accept delivery</button>
    </div>
  );
}

function MineCard({ order, onPickedUp, onDelivered }: { order: OrderRow; onPickedUp: () => void; onDelivered: () => void }) {
  const isActive = order.status === "out_for_delivery";
  const isDone = order.status === "delivered";
  const navUrl = order.delivery_lat && order.delivery_lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_lat},${order.delivery_lng}`
    : order.delivery_address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address)}`
    : null;

  return (
    <div className={`rounded-xl ring-1 p-3 ${isActive ? "ring-primary/40 bg-primary/5" : "ring-border"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">#{order.id.slice(0, 8)}</div>
          <div className="font-medium text-sm truncate">{order.order_items.map((i) => `${i.qty}× ${i.food_name}`).join(", ")}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-primary">₹{order.delivery_fee}</div>
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDone ? "bg-success/20 text-success" : "bg-primary/15 text-primary"}`}>
            {isDone ? "Delivered" : "Active"}
          </span>
        </div>
      </div>
      {isActive && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {navUrl && (
            <a href={navUrl} target="_blank" rel="noopener noreferrer" className="h-9 rounded-lg bg-secondary text-foreground text-xs font-semibold inline-flex items-center justify-center gap-1">
              <Navigation className="h-3.5 w-3.5" /> Navigate
            </a>
          )}
          {!order.picked_up_at ? (
            <button onClick={onPickedUp} className="h-9 rounded-lg bg-warning text-warning-foreground text-xs font-semibold col-span-2">Mark picked up</button>
          ) : (
            <button onClick={onDelivered} className="h-9 rounded-lg bg-success text-success-foreground text-xs font-semibold col-span-2 inline-flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
            </button>
          )}
        </div>
      )}
      {isDone && order.delivered_at && (
        <div className="mt-2 text-[11px] text-muted-foreground">Delivered {new Date(order.delivered_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</div>
      )}
    </div>
  );
}
