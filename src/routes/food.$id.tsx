import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock, MapPin, Star, MessageCircle, Minus, Plus, ShieldCheck, Loader2 } from "lucide-react";
import { VegBadge } from "@/components/FoodCard";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cartStore, DELIVERY_FEE } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FOOD_FALLBACK_IMAGE } from "@/lib/storage";

export const Route = createFileRoute("/food/$id")({
  head: () => ({ meta: [{ title: "Dish details — Deligo" }] }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md py-24 text-center px-4">
      <h1 className="text-2xl font-bold">Dish not found</h1>
      <Link to="/browse" className="mt-4 inline-block text-primary font-semibold">Browse meals →</Link>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
  component: FoodDetail,
});

async function fetchFood(id: string) {
  const { data, error } = await supabase.from("food_items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();
  const { data: cook } = await supabase.from("profiles").select("id,full_name,location,is_verified").eq("id", data.cook_id).maybeSingle();
  return { food: data, cook };
}

function FoodDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ["food", id], queryFn: () => fetchFood(id) });

  if (isLoading) return <div className="p-12 text-center text-muted-foreground inline-flex items-center gap-2 w-full justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (!data) return null;
  const { food, cook } = data;

  const addToCart = () => {
    cartStore.add({ foodId: food.id, cookId: food.cook_id, name: food.name, price: Number(food.price), image: food.image_url || FOOD_FALLBACK_IMAGE }, qty);
    toast.success(`${food.name} added to cart`);
  };

  const orderNow = () => {
    addToCart();
    navigate({ to: "/cart" });
  };

  const cookInitials = (cook?.full_name || "Cook").split(" ").map((s) => s[0]).join("").slice(0, 2);
  const total = Number(food.price) * qty + DELIVERY_FEE;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-3xl overflow-hidden ring-1 ring-border shadow-[var(--shadow-card)]">
          <img src={food.image_url || FOOD_FALLBACK_IMAGE} alt={food.name} className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = FOOD_FALLBACK_IMAGE; }} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <VegBadge veg={food.is_veg} />
            <span className="text-xs text-muted-foreground">{food.is_veg ? "Vegetarian" : "Non-vegetarian"}</span>
          </div>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold">{food.name}</h1>
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-warning text-warning" />{Number(food.rating).toFixed(1)}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{food.prep_minutes} min</span>
            {cook?.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{cook.location}</span>}
          </div>
          <p className="mt-4 text-muted-foreground leading-relaxed">{food.description ?? "Made fresh by a local home cook."}</p>

          <div className="mt-5 rounded-2xl bg-card ring-1 ring-border p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center font-bold text-lg">{cookInitials}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="font-semibold truncate">{cook?.full_name ?? "Home cook"}</div>
                {cook?.is_verified && <ShieldCheck className="h-4 w-4 text-success" />}
              </div>
              <div className="text-xs text-muted-foreground">{cook?.location ?? "Local kitchen"} · {Number(food.rating).toFixed(1)}★ · 30–45 min</div>
            </div>
            <button onClick={() => toast.info("Chat coming soon")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary px-3 py-2 rounded-lg hover:bg-secondary">
              <MessageCircle className="h-4 w-4" /> Chat
            </button>
          </div>

          <div className="mt-5 rounded-2xl bg-secondary/50 p-4 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Item ({qty} × ₹{food.price})</span><span>₹{Number(food.price) * qty}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery fee</span><span>₹{DELIVERY_FEE}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t border-border"><span>Total</span><span className="text-primary">₹{total}</span></div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl ring-1 ring-border bg-card">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-11 w-11 inline-flex items-center justify-center hover:bg-secondary rounded-l-xl"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="h-11 w-11 inline-flex items-center justify-center hover:bg-secondary rounded-r-xl"><Plus className="h-4 w-4" /></button>
            </div>
            <button onClick={addToCart} className="flex-1 h-11 rounded-xl bg-background ring-1 ring-border font-semibold hover:bg-secondary">Add to cart</button>
          </div>
          <button onClick={orderNow} className="mt-3 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-warm)] hover:opacity-95">
            Order now · ₹{total}
          </button>
          <p className="mt-3 text-xs text-muted-foreground text-center">Delivery is arranged by the cook or a local delivery partner.</p>
        </div>
      </div>
    </div>
  );
}
