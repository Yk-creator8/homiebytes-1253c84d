import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Plus, Pencil, Trash2, IndianRupee, ShoppingBag, TrendingUp, Check, X } from "lucide-react";
import { foods as seedFoods, type Food } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/cook")({
  head: () => ({ meta: [{ title: "Cook dashboard — Deligo" }, { name: "description", content: "Manage your homemade food menu, orders and earnings on Deligo." }] }),
  component: CookDashboard,
});

type Incoming = { id: string; customer: string; item: string; qty: number; total: number; status: "new" | "accepted" | "ready" | "rejected" };

function CookDashboard() {
  const [menu, setMenu] = useState<Food[]>(seedFoods.slice(0, 3));
  const [orders, setOrders] = useState<Incoming[]>([
    { id: "DLG2041", customer: "Rahul M.", item: "Paneer Butter Masala", qty: 2, total: 385, status: "new" },
    { id: "DLG2042", customer: "Sneha P.", item: "Veg Biryani", qty: 1, total: 185, status: "new" },
    { id: "DLG2039", customer: "Arjun K.", item: "Masala Dosa", qty: 3, total: 295, status: "accepted" },
  ]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", price: "", description: "", availability: "both" as Food["availability"] });

  const todayEarnings = orders.filter(o => o.status !== "rejected").reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.filter(o => o.status !== "rejected").length;

  const removeItem = (id: string) => setMenu(menu.filter(m => m.id !== id));
  const setOrderStatus = (id: string, status: Incoming["status"]) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
    toast.success(`Order #${id}: ${status}`);
  };

  const addDish = () => {
    if (!draft.name || !draft.price) { toast.error("Add a name and price"); return; }
    const newDish: Food = {
      id: `new-${Date.now()}`,
      name: draft.name,
      price: Number(draft.price),
      description: draft.description || "Fresh, homemade and delicious.",
      image: seedFoods[Math.floor(Math.random() * seedFoods.length)].image,
      veg: true, rating: 4.7, cookName: "You",
      cookLocation: "Your kitchen", distanceKm: 0, prepMinutes: 30,
      availability: draft.availability,
    };
    setMenu([newDish, ...menu]);
    setDraft({ name: "", price: "", description: "", availability: "both" });
    setAdding(false);
    toast.success("Dish added to your menu");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Profile header */}
      <div className="rounded-3xl p-6 md:p-8 text-primary-foreground" style={{ background: "var(--gradient-warm)" }}>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur inline-flex items-center justify-center text-2xl font-bold">AS</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl md:text-3xl font-bold">Anita's Kitchen</h1>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="opacity-90 text-sm">Koramangala · 4.8★ · 312 orders</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat icon={IndianRupee} label="Today's earnings" value={`₹${todayEarnings}`} />
        <Stat icon={ShoppingBag} label="Today's orders" value={String(totalOrders)} />
        <Stat icon={TrendingUp} label="This week" value="₹4,820" />
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        {/* Orders */}
        <section className="rounded-2xl bg-card ring-1 ring-border p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Incoming orders</h2>
          <div className="space-y-2">
            {orders.map(o => (
              <div key={o.id} className="rounded-xl ring-1 ring-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">#{o.id} · {o.customer}</div>
                    <div className="font-medium text-sm">{o.qty}× {o.item}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">₹{o.total}</div>
                    <StatusPill status={o.status} />
                  </div>
                </div>
                {o.status === "new" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setOrderStatus(o.id, "accepted")} className="flex-1 h-9 rounded-lg bg-success text-success-foreground text-sm font-semibold inline-flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Accept</button>
                    <button onClick={() => setOrderStatus(o.id, "rejected")} className="flex-1 h-9 rounded-lg bg-secondary text-foreground text-sm font-semibold inline-flex items-center justify-center gap-1"><X className="h-4 w-4" /> Reject</button>
                  </div>
                )}
                {o.status === "accepted" && (
                  <button onClick={() => setOrderStatus(o.id, "ready")} className="mt-3 w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Mark as ready</button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Menu */}
        <section className="rounded-2xl bg-card ring-1 ring-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Your menu</h2>
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              <Plus className="h-4 w-4" /> Add dish
            </button>
          </div>

          {adding && (
            <div className="mb-3 rounded-xl ring-1 ring-primary/30 bg-primary/5 p-3 space-y-2">
              <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Dish name" className="w-full rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} type="number" placeholder="Price (₹)" className="rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm" />
                <select value={draft.availability} onChange={e => setDraft({ ...draft, availability: e.target.value as Food["availability"] })} className="rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm">
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="both">Lunch & dinner</option>
                </select>
              </div>
              <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Description" rows={2} className="w-full rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm resize-none" />
              <div className="flex gap-2">
                <button onClick={addDish} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Save dish</button>
                <button onClick={() => setAdding(false)} className="h-9 px-3 rounded-lg bg-secondary text-sm font-semibold">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {menu.map(m => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl ring-1 ring-border p-2">
                <img src={m.image} alt={m.name} className="h-14 w-14 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-sm">{m.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">₹{m.price} · {m.availability}</div>
                </div>
                <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => removeItem(m.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">Delivery is arranged by you or a local partner. Deligo handles the orders, you handle the magic. ✨</p>
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

function StatusPill({ status }: { status: Incoming["status"] }) {
  const map = {
    new: { bg: "bg-warning/20", text: "text-warning-foreground", label: "New" },
    accepted: { bg: "bg-primary/15", text: "text-primary", label: "Accepted" },
    ready: { bg: "bg-success/20", text: "text-success", label: "Ready" },
    rejected: { bg: "bg-destructive/15", text: "text-destructive", label: "Rejected" },
  }[status];
  return <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${map.bg} ${map.text}`}>{map.label}</span>;
}
