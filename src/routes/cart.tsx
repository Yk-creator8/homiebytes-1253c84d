import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart, cartStore, DELIVERY_FEE } from "@/lib/cart-store";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your cart — Deligo" }, { name: "description", content: "Review and checkout your homemade meal order." }] }),
  component: Cart,
});

const ORDERS_KEY = "deligo-orders-v1";

function Cart() {
  const items = useCart();
  const navigate = useNavigate();
  const subtotal = items.reduce((s, i) => s + i.food.price * i.qty, 0);
  const total = items.length ? subtotal + DELIVERY_FEE : 0;

  const placeOrder = () => {
    const order = {
      id: `DLG${Date.now().toString().slice(-6)}`,
      items: items.map((i) => ({ name: i.food.name, qty: i.qty, price: i.food.price, image: i.food.image, cook: i.food.cookName })),
      total,
      placedAt: new Date().toISOString(),
      status: "placed" as const,
    };
    const existing = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    localStorage.setItem(ORDERS_KEY, JSON.stringify([order, ...existing]));
    cartStore.clear();
    toast.success("Order placed!");
    navigate({ to: "/orders" });
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-24 text-center px-4">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-secondary inline-flex items-center justify-center">
          <ShoppingBag className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse fresh homemade meals near you.</p>
        <Link to="/browse" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Browse meals</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Your cart</h1>
      <div className="mt-6 grid md:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-3">
          {items.map(({ food, qty }) => (
            <div key={food.id} className="flex gap-4 rounded-2xl bg-card ring-1 ring-border p-3">
              <img src={food.image} alt={food.name} className="h-20 w-20 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{food.name}</div>
                <div className="text-xs text-muted-foreground">by {food.cookName}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-lg ring-1 ring-border">
                    <button onClick={() => cartStore.setQty(food.id, qty - 1)} className="h-8 w-8 inline-flex items-center justify-center hover:bg-secondary rounded-l-lg"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                    <button onClick={() => cartStore.setQty(food.id, qty + 1)} className="h-8 w-8 inline-flex items-center justify-center hover:bg-secondary rounded-r-lg"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-primary">₹{food.price * qty}</div>
                    <button onClick={() => cartStore.remove(food.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-2xl bg-card ring-1 ring-border p-5 h-fit md:sticky md:top-20">
          <h2 className="font-display font-semibold text-lg">Bill summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery fee</span><span>₹{DELIVERY_FEE}</span></div>
            <div className="flex justify-between pt-3 border-t border-border font-bold text-base"><span>Total</span><span className="text-primary">₹{total}</span></div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold mb-2">Payment</div>
            <div className="rounded-xl ring-1 ring-border p-3 text-sm flex items-center justify-between bg-secondary/50">
              <span>UPI · pay on delivery</span>
              <span className="text-xs text-muted-foreground">(placeholder)</span>
            </div>
          </div>

          <button onClick={placeOrder} className="mt-5 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-warm)] hover:opacity-95">
            Place order · ₹{total}
          </button>
          <p className="mt-3 text-xs text-muted-foreground text-center">Delivery arranged by cook or local partner.</p>
        </aside>
      </div>
    </div>
  );
}
