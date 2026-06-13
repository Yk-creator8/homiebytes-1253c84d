import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock, MapPin, Star, MessageCircle, Minus, Plus, ShieldCheck } from "lucide-react";
import { getFood } from "@/lib/mock-data";
import { VegBadge } from "@/components/FoodCard";
import { useState } from "react";
import { cartStore, DELIVERY_FEE } from "@/lib/cart-store";
import { toast } from "sonner";

export const Route = createFileRoute("/food/$id")({
  loader: ({ params }) => {
    const food = getFood(params.id);
    if (!food) throw notFound();
    return { food };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.food.name} — Deligo` },
      { name: "description", content: loaderData.food.description },
      { property: "og:title", content: `${loaderData.food.name} by ${loaderData.food.cookName}` },
      { property: "og:description", content: loaderData.food.description },
      { property: "og:image", content: loaderData.food.image },
    ] : [],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md py-24 text-center px-4">
      <h1 className="text-2xl font-bold">Dish not found</h1>
      <Link to="/browse" className="mt-4 inline-block text-primary font-semibold">Browse meals →</Link>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
  component: FoodDetail,
});

function FoodDetail() {
  const { food } = Route.useLoaderData();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);

  const addToCart = () => {
    cartStore.add(food, qty);
    toast.success(`${food.name} added to cart`);
  };

  const orderNow = () => {
    cartStore.add(food, qty);
    navigate({ to: "/cart" });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-3xl overflow-hidden ring-1 ring-border shadow-[var(--shadow-card)]">
          <img src={food.image} alt={food.name} className="h-full w-full object-cover" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <VegBadge veg={food.veg} />
            <span className="text-xs text-muted-foreground">{food.veg ? "Vegetarian" : "Non-vegetarian"}</span>
          </div>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold">{food.name}</h1>
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-warning text-warning" />{food.rating}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{food.prepMinutes} min</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{food.distanceKm} km</span>
          </div>
          <p className="mt-4 text-muted-foreground leading-relaxed">{food.description}</p>

          {/* Cook card */}
          <div className="mt-5 rounded-2xl bg-card ring-1 ring-border p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center font-bold text-lg">
              {food.cookName.split(" ").map((s) => s[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="font-semibold truncate">{food.cookName}</div>
                <ShieldCheck className="h-4 w-4 text-success" />
              </div>
              <div className="text-xs text-muted-foreground">{food.cookLocation} · {food.rating}★</div>
            </div>
            <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary px-3 py-2 rounded-lg hover:bg-secondary">
              <MessageCircle className="h-4 w-4" /> Chat
            </button>
          </div>

          {/* Price breakdown */}
          <div className="mt-5 rounded-2xl bg-secondary/50 p-4 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Item ({qty} × ₹{food.price})</span><span>₹{food.price * qty}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery fee</span><span>₹{DELIVERY_FEE}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t border-border"><span>Total</span><span className="text-primary">₹{food.price * qty + DELIVERY_FEE}</span></div>
          </div>

          {/* Qty + actions */}
          <div className="mt-5 flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl ring-1 ring-border bg-card">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-11 w-11 inline-flex items-center justify-center hover:bg-secondary rounded-l-xl"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="h-11 w-11 inline-flex items-center justify-center hover:bg-secondary rounded-r-xl"><Plus className="h-4 w-4" /></button>
            </div>
            <button onClick={addToCart} className="flex-1 h-11 rounded-xl bg-background ring-1 ring-border font-semibold hover:bg-secondary">Add to cart</button>
          </div>
          <button onClick={orderNow} className="mt-3 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-warm)] hover:opacity-95">
            Order now · ₹{food.price * qty + DELIVERY_FEE}
          </button>
          <p className="mt-3 text-xs text-muted-foreground text-center">Delivery arranged by cook or local partner</p>
        </div>
      </div>
    </div>
  );
}
