import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, ChefHat, Bike, Package } from "lucide-react";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Your orders — Deligo" }, { name: "description", content: "Track your homemade food orders and view past orders." }] }),
  component: Orders,
});

type Order = {
  id: string;
  items: { name: string; qty: number; price: number; image: string; cook: string }[];
  total: number;
  placedAt: string;
  status: "placed" | "preparing" | "out" | "delivered";
};

const STATUS_STEPS = [
  { key: "placed", label: "Order placed", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "out", label: "Out for delivery", icon: Bike },
  { key: "delivered", label: "Delivered", icon: Package },
] as const;

function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("deligo-orders-v1");
      setOrders(raw ? JSON.parse(raw) : []);
    } catch {}
  }, []);

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-md py-24 text-center px-4">
        <h1 className="font-display text-2xl font-bold">No orders yet</h1>
        <p className="mt-2 text-muted-foreground">Place your first homemade meal order.</p>
        <Link to="/browse" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Browse meals</Link>
      </div>
    );
  }

  const [current, ...past] = orders;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Your orders</h1>
        <p className="text-muted-foreground mt-1">Track current and past orders.</p>
      </div>

      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Current order</h2>
        <div className="rounded-2xl bg-card ring-1 ring-border p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Order #{current.id}</div>
              <div className="font-semibold">{current.items.length} item{current.items.length > 1 ? "s" : ""} · ₹{current.total}</div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/20 text-warning-foreground px-3 py-1 text-xs font-medium">
              <Clock className="h-3 w-3" /> ~35 min
            </span>
          </div>

          <div className="mt-6">
            <div className="relative flex justify-between">
              {STATUS_STEPS.map((s, i) => {
                const activeIdx = STATUS_STEPS.findIndex((x) => x.key === current.status);
                const done = i <= activeIdx;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex flex-col items-center flex-1 relative">
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`absolute top-5 left-1/2 w-full h-0.5 ${i < activeIdx ? "bg-primary" : "bg-border"}`} />
                    )}
                    <div className={`relative z-10 h-10 w-10 rounded-full inline-flex items-center justify-center ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className={`mt-2 text-[11px] text-center ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {current.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <img src={it.image} alt={it.name} className="h-10 w-10 rounded-lg object-cover" />
                <div className="flex-1"><div className="font-medium">{it.name}</div><div className="text-xs text-muted-foreground">by {it.cook}</div></div>
                <div className="text-muted-foreground">×{it.qty}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Past orders</h2>
          <div className="space-y-2">
            {past.map((o) => (
              <div key={o.id} className="rounded-xl bg-card ring-1 ring-border p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">#{o.id} · {new Date(o.placedAt).toLocaleDateString()}</div>
                  <div className="text-sm font-medium">{o.items.map((i) => i.name).join(", ")}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">₹{o.total}</div>
                  <div className="text-xs text-success">Delivered</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
