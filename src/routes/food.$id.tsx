import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock, MapPin, Star, MessageCircle, Minus, Plus, ShieldCheck, Loader2, Heart, Send } from "lucide-react";
import { VegBadge } from "@/components/FoodCard";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cartStore, DELIVERY_FEE } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FOOD_FALLBACK_IMAGE } from "@/lib/storage";
import { CUISINE_EMOJI } from "@/lib/cuisines";
import { useFavorites } from "@/lib/favorites-store";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/food/$id")({
  head: () => ({ meta: [{ title: "Dish details — CloudBites" }] }),
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

async function fetchReviews(foodId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id,user_id,rating,comment,created_at")
    .eq("food_id", foodId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const uids = [...new Set((data ?? []).map((r) => r.user_id))];
  let nameMap: Record<string, string> = {};
  if (uids.length) {
    const { data: ps } = await supabase.from("profiles").select("id,full_name").in("id", uids);
    nameMap = Object.fromEntries((ps ?? []).map((p) => [p.id, p.full_name ?? "Customer"]));
  }
  return (data ?? []).map((r) => ({ ...r, user_name: nameMap[r.user_id] ?? "Customer" }));
}

function FoodDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ["food", id], queryFn: () => fetchFood(id) });
  const { has, toggle } = useFavorites();

  if (isLoading) return <div className="p-12 text-center text-muted-foreground inline-flex items-center gap-2 w-full justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (!data) return null;
  const { food, cook } = data;
  const fav = has(food.id);

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
        <div className="relative aspect-square rounded-3xl overflow-hidden ring-1 ring-border shadow-[var(--shadow-card)]">
          <img src={food.image_url || FOOD_FALLBACK_IMAGE} alt={food.name} className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = FOOD_FALLBACK_IMAGE; }} />
          <button
            onClick={() => toggle(food.id)}
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            className="absolute top-4 right-4 h-11 w-11 inline-flex items-center justify-center rounded-full bg-background/95 backdrop-blur shadow-[var(--shadow-card)] hover:scale-110 transition"
          >
            <Heart className={`h-5 w-5 ${fav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
          </button>
          {food.cuisine && (
            <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <span>{CUISINE_EMOJI[food.cuisine] ?? "🍽️"}</span> {food.cuisine}
            </div>
          )}
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

          <Link to="/cooks/$id" params={{ id: food.cook_id }} className="mt-5 block rounded-2xl bg-card ring-1 ring-border p-4 hover:ring-primary/40 transition">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center font-bold text-lg">{cookInitials}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="font-semibold truncate">{cook?.full_name ?? "Home cook"}</div>
                  {cook?.is_verified && <ShieldCheck className="h-4 w-4 text-success" />}
                </div>
                <div className="text-xs text-muted-foreground">{cook?.location ?? "Local kitchen"} · View full menu →</div>
              </div>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>

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

      <ReviewsSection foodId={food.id} />
    </div>
  );
}

function ReviewsSection({ foodId }: { foodId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: reviews = [], isLoading } = useQuery({ queryKey: ["reviews", foodId], queryFn: () => fetchReviews(foodId) });
  const myReview = user ? reviews.find((r) => r.user_id === user.id) : undefined;
  const [rating, setRating] = useState(myReview?.rating ?? 5);
  const [comment, setComment] = useState(myReview?.comment ?? "");
  const [busy, setBusy] = useState(false);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const submit = async () => {
    if (!user) { toast.error("Sign in to leave a review"); return; }
    setBusy(true);
    const { error } = await supabase
      .from("reviews")
      .upsert({ food_id: foodId, user_id: user.id, rating, comment: comment.trim().slice(0, 500) || null }, { onConflict: "food_id,user_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(myReview ? "Review updated" : "Thanks for your review!");
    qc.invalidateQueries({ queryKey: ["reviews", foodId] });
  };

  return (
    <section className="mt-12">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Reviews</h2>
          {reviews.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" /> {avg.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {user ? (
        <div className="rounded-2xl bg-card ring-1 ring-border p-4">
          <div className="text-sm font-semibold mb-2">{myReview ? "Update your review" : "Leave a review"}</div>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={`h-7 w-7 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was it? (optional)"
            rows={2}
            maxLength={500}
            className="w-full rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm resize-none"
          />
          <button onClick={submit} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 h-10 text-sm font-semibold disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {myReview ? "Update" : "Post review"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-secondary/50 p-4 text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary font-semibold">Sign in</Link> to leave a review.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading reviews…</div>
        ) : reviews.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No reviews yet. Be the first!</div>
        ) : reviews.map((r) => (
          <div key={r.id} className="rounded-xl ring-1 ring-border p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">{r.user_name}</div>
              <div className="inline-flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                ))}
              </div>
            </div>
            {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
            <div className="mt-1 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
