import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, ChefHat, Bike, Package, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Your orders — HomieBytes" }] }),
  component: Orders,
});

type Status = "placed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "rejected";

const STATUS_STEPS = [
  { key: "placed" as const, label: "Placed", icon: CheckCircle2 },
  { key: "preparing" as const, label: "Preparing", icon: ChefHat },
  { key: "out_for_delivery" as const, label: "Out for delivery", icon: Bike },
  { key: "delivered" as const, label: "Delivered", icon: Package },
];

type OrderRow = {
  id: string; total: number; status: Status; created_at: string; delivery_fee: number; delivery_address: string | null; cook_id: string;
  order_items: { food_name: string; food_image: string | null; qty: number; unit_price: number }[];
  cook: { full_name: string | null; location: string | null } | null;
};

async function fetchOrders(uid: string): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id,total,status,created_at,delivery_fee,delivery_address,cook_id,order_items(food_name,food_image,qty,unit_price)")
    .eq("customer_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const cookIds = [...new Set((data ?? []).map((o) => o.cook_id))];
  const cookMap: Record<string, { full_name: string | null; location: string | null }> = {};
  if (cookIds.length) {
    const { data: cs } = await supabase.from("profiles").select("id,full_name,location").in("id", cookIds);
    (cs ?? []).forEach((c) => { cookMap[c.id] = { full_name: c.full_name, location: c.location }; });
  }
  return (data ?? []).map((o: any) => ({ ...o, total: Number(o.total), delivery_fee: Number(o.delivery_fee), cook: cookMap[o.cook_id] ?? null }));
}

function Orders() {
  const { user } = useAuth();
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: () => fetchOrders(user!.id),
    enabled: !!user,
  });
  const [, force] = useState(0);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("orders-customer")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${user.id}` }, () => {
        refetch();
        force((n) => n + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refetch]);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground inline-flex items-center justify-center gap-2 w-full"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-md py-24 text-center px-4">
        <h1 className="font-display text-2xl font-bold">No orders yet</h1>
        <p className="mt-2 text-muted-foreground">Place your first homemade meal order.</p>
        <Link to="/browse" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Browse meals</Link>
      </div>
    );
  }

  const active = orders.filter((o) => o.status !== "delivered" && o.status !== "rejected");
  const past = orders.filter((o) => o.status === "delivered" || o.status === "rejected");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Your orders</h1>
        <p className="text-muted-foreground mt-1">Track current and past orders.</p>
      </div>

      {active.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Active orders</h2>
          {active.map((o) => <ActiveOrderCard key={o.id} order={o} />)}
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Past orders</h2>
          <div className="space-y-2">
            {past.map((o) => (
              <div key={o.id} className="rounded-xl bg-card ring-1 ring-border p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}</div>
                  <div className="text-sm font-medium truncate">{o.order_items.map((i) => i.food_name).join(", ")}</div>
                  <div className="text-xs text-muted-foreground">by {o.cook?.full_name ?? "Home cook"}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">₹{o.total}</div>
                  <div className={`text-xs ${o.status === "rejected" ? "text-destructive" : "text-success"}`}>{o.status === "rejected" ? "Rejected" : "Delivered"}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-xs text-muted-foreground">Delivery is arranged by the cook or a local delivery partner.</p>
    </div>
  );
}

function ActiveOrderCard({ order }: { order: OrderRow }) {
  const activeIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const ready = order.status === "ready";
  const rejected = order.status === "rejected";

  return (
    <div className="rounded-2xl bg-card ring-1 ring-border p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Order #{order.id.slice(0, 8)}</div>
          <div className="font-semibold">{order.order_items.length} item{order.order_items.length > 1 ? "s" : ""} · ₹{order.total}</div>
          <div className="text-xs text-muted-foreground">from {order.cook?.full_name ?? "Home cook"}</div>
        </div>
        {rejected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 text-destructive px-3 py-1 text-xs font-medium"><XCircle className="h-3 w-3" /> Rejected by cook</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/20 text-warning-foreground px-3 py-1 text-xs font-medium">
            <Clock className="h-3 w-3" /> ~35 min
          </span>
        )}
      </div>

      {!rejected && (
        <div className="mt-6 relative flex justify-between">
          {STATUS_STEPS.map((s, i) => {
            const done = ready ? i <= 2 : i <= activeIdx;
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex flex-col items-center flex-1 relative">
                {i < STATUS_STEPS.length - 1 && <div className={`absolute top-5 left-1/2 w-full h-0.5 ${i < (ready ? 2 : activeIdx) ? "bg-primary" : "bg-border"}`} />}
                <div className={`relative z-10 h-10 w-10 rounded-full inline-flex items-center justify-center ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className={`mt-2 text-[11px] text-center ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 space-y-2">
        {order.order_items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            {it.food_image && <img src={it.food_image} alt={it.food_name} className="h-10 w-10 rounded-lg object-cover" />}
            <div className="flex-1"><div className="font-medium">{it.food_name}</div></div>
            <div className="text-muted-foreground">×{it.qty}</div>
          </div>
        ))}
      </div>
      {order.delivery_address && <div className="mt-4 text-xs text-muted-foreground border-t border-border pt-3">Delivering to: {order.delivery_address}</div>}
    </div>
  );
}
