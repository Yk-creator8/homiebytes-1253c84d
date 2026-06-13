import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { useState } from "react";
import { useCart, cartStore, DELIVERY_FEE } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({ meta: [{ title: "Your cart — Deligo" }] }),
  component: Cart,
});

function Cart() {
  const items = useCart();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"cod" | "upi">("cod");
  const [busy, setBusy] = useState(false);

  // Group by cook
  const byCook = items.reduce<Record<string, typeof items>>((acc, i) => {
    (acc[i.cookId] ||= []).push(i);
    return acc;
  }, {});

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const cookCount = Object.keys(byCook).length;
  const totalDelivery = cookCount * DELIVERY_FEE;
  const total = subtotal + totalDelivery;

  const placeOrder = async () => {
    if (!user) return;
    if (role !== "customer") { toast.error("Switch to a customer account to order"); return; }
    if (!address.trim()) { toast.error("Add a delivery address"); return; }
    setBusy(true);
    try {
      for (const [cookId, cookItems] of Object.entries(byCook)) {
        const cookSubtotal = cookItems.reduce((s, i) => s + i.price * i.qty, 0);
        const { data: order, error } = await supabase.from("orders").insert({
          customer_id: user.id,
          cook_id: cookId,
          total: cookSubtotal + DELIVERY_FEE,
          delivery_fee: DELIVERY_FEE,
          delivery_address: address.trim(),
        }).select().single();
        if (error) throw error;
        const lines = cookItems.map((i) => ({
          order_id: order.id, food_id: i.foodId, food_name: i.name, food_image: i.image,
          unit_price: i.price, qty: i.qty,
        }));
        const { error: liErr } = await supabase.from("order_items").insert(lines);
        if (liErr) throw liErr;
      }
      cartStore.clear();
      toast.success(cookCount > 1 ? `${cookCount} orders placed!` : "Order placed!");
      navigate({ to: "/orders" });
    } catch (e: any) {
      toast.error(e.message ?? "Could not place order");
    } finally {
      setBusy(false);
    }
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
          {items.map((i) => (
            <div key={i.foodId} className="flex gap-4 rounded-2xl bg-card ring-1 ring-border p-3">
              <img src={i.image} alt={i.name} className="h-20 w-20 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{i.name}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-lg ring-1 ring-border">
                    <button onClick={() => cartStore.setQty(i.foodId, i.qty - 1)} className="h-8 w-8 inline-flex items-center justify-center hover:bg-secondary rounded-l-lg"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center text-sm font-semibold">{i.qty}</span>
                    <button onClick={() => cartStore.setQty(i.foodId, i.qty + 1)} className="h-8 w-8 inline-flex items-center justify-center hover:bg-secondary rounded-r-lg"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-primary">₹{i.price * i.qty}</div>
                    <button onClick={() => cartStore.remove(i.foodId)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-2xl bg-card ring-1 ring-border p-5 h-fit md:sticky md:top-20">
          <h2 className="font-display font-semibold text-lg">Checkout</h2>

          <div className="mt-3">
            <label className="text-xs font-semibold text-muted-foreground">Delivery address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} maxLength={500} placeholder="House / flat, street, area, landmark" className="mt-1 w-full rounded-xl bg-background ring-1 ring-border px-3 py-2 text-sm resize-none" />
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery {cookCount > 1 && `(${cookCount} cooks)`}</span><span>₹{totalDelivery}</span></div>
            <div className="flex justify-between pt-3 border-t border-border font-bold text-base"><span>Total</span><span className="text-primary">₹{total}</span></div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">Payment method</div>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 rounded-xl ring-1 p-3 cursor-pointer text-sm ${payment === "cod" ? "ring-primary bg-primary/5" : "ring-border"}`}>
                <input type="radio" checked={payment === "cod"} onChange={() => setPayment("cod")} className="accent-primary" />
                <div className="flex-1">
                  <div className="font-medium">Cash on delivery</div>
                  <div className="text-xs text-muted-foreground">Pay the cook or delivery partner when food arrives</div>
                </div>
              </label>
              <label className={`flex items-center gap-3 rounded-xl ring-1 p-3 cursor-pointer text-sm ${payment === "upi" ? "ring-primary bg-primary/5" : "ring-border"}`}>
                <input type="radio" checked={payment === "upi"} onChange={() => setPayment("upi")} className="accent-primary" />
                <div className="flex-1">
                  <div className="font-medium">UPI / Online</div>
                  <div className="text-xs text-muted-foreground">Pay directly to the cook via UPI after order confirmation</div>
                </div>
              </label>
            </div>
          </div>

          <button onClick={placeOrder} disabled={busy} className="mt-5 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-warm)] hover:opacity-95 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Place order · ₹{total}
          </button>
          <p className="mt-3 text-xs text-muted-foreground text-center">Delivery is arranged by the cook or a local delivery partner.</p>
        </aside>
      </div>
    </div>
  );
}
