import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Plus, Trash2, IndianRupee, ShoppingBag, TrendingUp, Check, X, Loader2, Upload, Power, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadFoodImage, FOOD_FALLBACK_IMAGE } from "@/lib/storage";
import { CUISINES } from "@/lib/cuisines";
import { toast } from "sonner";
import { CookFeeCheckout } from "@/components/CookFeeCheckout";
import { COOK_JOINING_FEE_INR } from "@/lib/cook-fee.functions";
import { notifyOrderStatusChange } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/cook")({
  head: () => ({ meta: [{ title: "Cook dashboard — HomieBytes" }] }),
  component: CookDashboard,
});

type Status = "placed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "rejected";

const NEXT_STATUS: Record<Status, { next: Status; label: string } | null> = {
  placed: { next: "preparing", label: "Accept & start preparing" },
  preparing: { next: "ready", label: "Mark ready" },
  ready: { next: "out_for_delivery", label: "Out for delivery" },
  out_for_delivery: { next: "delivered", label: "Mark delivered" },
  delivered: null,
  rejected: null,
};

function CookDashboard() {
  const { user, profile, role, loading: authLoading, refresh } = useAuth();
  const qc = useQueryClient();

  // Block non-cooks (defense-in-depth on top of RLS)
  if (!authLoading && role !== "cook") {
    return (
      <div className="mx-auto max-w-md py-24 text-center px-4">
        <h1 className="font-display text-2xl font-bold">Cook access required</h1>
        <p className="mt-2 text-muted-foreground">This area is for home cooks. Switch your role to access the kitchen dashboard.</p>
        <Link to="/onboarding" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Choose role</Link>
      </div>
    );
  }

  // Joining fee gate
  if (!authLoading && role === "cook" && profile && !profile.cook_fee_paid) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 animate-fade-in">
        <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8 shadow-[var(--shadow-warm)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Finish your cloud kitchen setup
          </div>
          <h1 className="mt-3 font-display text-2xl md:text-3xl font-bold">One-time joining fee · <span className="inline-flex items-center"><IndianRupee className="h-5 w-5" />{COOK_JOINING_FEE_INR}</span></h1>
          <p className="mt-2 text-muted-foreground text-sm">Pay once to activate your cook dashboard, get verified, and start receiving orders.</p>
          <div className="mt-6"><CookFeeCheckout onPaid={() => window.location.reload()} /></div>
        </div>
      </div>
    );
  }

  const menuQ = useQuery({
    queryKey: ["cook-menu", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_items").select("*").eq("cook_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const ordersQ = useQuery({
    queryKey: ["cook-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,status,total,created_at,delivery_address,customer_id,order_items(food_name,qty,unit_price)")
        .eq("cook_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const custIds = [...new Set((data ?? []).map((o) => o.customer_id))];
      const custMap: Record<string, string> = {};
  if (custIds.length) {
    const { data: cs } = await supabase.from("public_profiles").select("id,full_name").in("id", custIds);
    (cs ?? []).forEach((c) => { if (c.id) custMap[c.id] = c.full_name ?? "Customer"; });
  }

      return (data ?? []).map((o: any) => ({ ...o, customer_name: custMap[o.customer_id] ?? "Customer", total: Number(o.total) }));
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("cook-orders-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `cook_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["cook-orders", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const updateStatus = async (orderId: string, status: Status) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success(`Order updated`);
    notifyOrderStatusChange({ data: { orderId, status } }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["cook-orders", user!.id] });
  };

  // Earnings stats
  const orders = ordersQ.data ?? [];
  const completed = orders.filter((o) => o.status === "delivered");
  const totalRevenue = completed.reduce((s, o) => s + o.total, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayRevenue = completed.filter((o) => new Date(o.created_at) >= today).reduce((s, o) => s + o.total, 0);
  const activeOrders = orders.filter((o) => o.status !== "delivered" && o.status !== "rejected");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Profile header */}
      <div className="rounded-3xl p-6 md:p-8 text-primary-foreground" style={{ background: "var(--gradient-warm)" }}>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur inline-flex items-center justify-center text-2xl font-bold">
            {(profile?.full_name || "Cook").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl md:text-3xl font-bold truncate">{profile?.full_name || "Your kitchen"}</h1>
              {profile?.is_verified && <ShieldCheck className="h-5 w-5" />}
            </div>
            <p className="opacity-90 text-sm">{profile?.location || "Add your kitchen location"} · {orders.length} total orders</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat icon={IndianRupee} label="Today's earnings" value={`₹${todayRevenue}`} />
        <Stat icon={ShoppingBag} label="Active orders" value={String(activeOrders.length)} />
        <Stat icon={TrendingUp} label="Total revenue" value={`₹${totalRevenue}`} />
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <OrdersPanel orders={orders} updateStatus={updateStatus} loading={ordersQ.isLoading} />
        <MenuPanel items={menuQ.data ?? []} loading={menuQ.isLoading} userId={user!.id} onChange={() => qc.invalidateQueries({ queryKey: ["cook-menu", user!.id] })} />
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">Delivery is arranged by you or a local partner. HomieBytes handles the orders, you handle the magic. ✨</p>
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

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { bg: string; text: string; label: string }> = {
    placed: { bg: "bg-warning/20", text: "text-warning-foreground", label: "New" },
    preparing: { bg: "bg-primary/15", text: "text-primary", label: "Preparing" },
    ready: { bg: "bg-success/20", text: "text-success", label: "Ready" },
    out_for_delivery: { bg: "bg-primary/15", text: "text-primary", label: "Out for delivery" },
    delivered: { bg: "bg-success/20", text: "text-success", label: "Delivered" },
    rejected: { bg: "bg-destructive/15", text: "text-destructive", label: "Rejected" },
  };
  const m = map[status];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.bg} ${m.text}`}>{m.label}</span>;
}

function OrdersPanel({ orders, updateStatus, loading }: { orders: any[]; updateStatus: (id: string, s: Status) => void; loading: boolean }) {
  return (
    <section className="rounded-2xl bg-card ring-1 ring-border p-5">
      <h2 className="font-display text-lg font-semibold mb-3">Incoming orders</h2>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : orders.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No orders yet. Once your menu is live, customers can place orders.</div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const next = NEXT_STATUS[o.status as Status];
            return (
              <div key={o.id} className="rounded-xl ring-1 ring-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)} · {o.customer_name} · {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="font-medium text-sm">{o.order_items.map((i: any) => `${i.qty}× ${i.food_name}`).join(", ")}</div>
                    {o.delivery_address && <div className="text-xs text-muted-foreground mt-0.5 truncate">📍 {o.delivery_address}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-primary">₹{o.total}</div>
                    <StatusPill status={o.status} />
                  </div>
                </div>
                {o.status === "placed" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => updateStatus(o.id, "preparing")} className="flex-1 h-9 rounded-lg bg-success text-success-foreground text-sm font-semibold inline-flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Accept</button>
                    <button onClick={() => updateStatus(o.id, "rejected")} className="flex-1 h-9 rounded-lg bg-secondary text-foreground text-sm font-semibold inline-flex items-center justify-center gap-1"><X className="h-4 w-4" /> Reject</button>
                  </div>
                )}
                {next && o.status !== "placed" && (
                  <button onClick={() => updateStatus(o.id, next.next)} className="mt-3 w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">{next.label}</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MenuPanel({ items, loading, userId, onChange }: { items: any[]; loading: boolean; userId: string; onChange: () => void }) {
  const [adding, setAdding] = useState(false);

  const toggleAvail = async (id: string, current: boolean) => {
    const { error } = await supabase.from("food_items").update({ is_available: !current }).eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("food_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Dish removed");
    onChange();
  };

  return (
    <section className="rounded-2xl bg-card ring-1 ring-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold">Your menu</h2>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <Plus className="h-4 w-4" /> Add dish
        </button>
      </div>

      {adding && <AddDishForm userId={userId} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); onChange(); }} />}

      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No dishes yet. Add your first to start receiving orders.</div>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl ring-1 ring-border p-2">
              <img src={m.image_url || FOOD_FALLBACK_IMAGE} alt={m.name} className="h-14 w-14 rounded-lg object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = FOOD_FALLBACK_IMAGE; }} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-sm">{m.name}</div>
                <div className="text-xs text-muted-foreground capitalize">₹{m.price} · {m.availability} · {m.is_veg ? "Veg" : "Non-veg"}</div>
              </div>
              <button onClick={() => toggleAvail(m.id, m.is_available)} title={m.is_available ? "Disable" : "Enable"} className={`h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-secondary ${m.is_available ? "text-success" : "text-muted-foreground"}`}>
                <Power className="h-4 w-4" />
              </button>
              <button aria-label="Delete dish" onClick={() => remove(m.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AddDishForm({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [availability, setAvailability] = useState<"lunch" | "dinner" | "both">("both");
  const [isVeg, setIsVeg] = useState(true);
  const [cuisine, setCuisine] = useState<string>("Other");
  const [prepMin, setPrepMin] = useState("30");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!name.trim() || !price) { toast.error("Name and price are required"); return; }
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0 || p > 5000) { toast.error("Enter a valid price"); return; }
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (file) image_url = await uploadFoodImage(file, userId);
      const { error } = await supabase.from("food_items").insert({
        cook_id: userId,
        name: name.trim().slice(0, 120),
        description: description.trim().slice(0, 600) || null,
        price: p,
        image_url,
        is_veg: isVeg,
        availability,
        cuisine,
        prep_minutes: Math.max(5, Math.min(180, Number(prepMin) || 30)),
        is_available: true,
      });
      if (error) throw error;
      toast.success("Dish published — now live for customers to order");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Could not save dish");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-3 rounded-xl ring-1 ring-primary/30 bg-primary/5 p-3 space-y-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dish name" maxLength={120} className="w-full rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="Price (₹)" min="1" max="5000" className="rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm" />
        <input value={prepMin} onChange={(e) => setPrepMin(e.target.value)} type="number" placeholder="Prep min" min="5" max="180" className="rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={isVeg ? "veg" : "nonveg"} onChange={(e) => setIsVeg(e.target.value === "veg")} className="rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm">
          <option value="veg">Vegetarian</option>
          <option value="nonveg">Non-vegetarian</option>
        </select>
        <select value={availability} onChange={(e) => setAvailability(e.target.value as any)} className="rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm">
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="both">Lunch & dinner</option>
        </select>
      </div>
      <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="w-full rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm">
        {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2} maxLength={600} className="w-full rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm resize-none" />
      <div>
        <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm inline-flex items-center justify-center gap-2 hover:bg-secondary">
          <Upload className="h-4 w-4" /> {file ? file.name : "Upload photo (optional)"}
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save dish</button>
        <button onClick={onClose} disabled={busy} className="h-9 px-3 rounded-lg bg-secondary text-sm font-semibold">Cancel</button>
      </div>
    </div>
  );
}
