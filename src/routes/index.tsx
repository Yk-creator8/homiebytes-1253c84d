import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Utensils, ShoppingBag, Bike, ChefHat, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { FoodCard, type FoodCardData } from "@/components/FoodCard";
import { supabase } from "@/integrations/supabase/client";
import heroFood from "@/assets/hero-food.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Deligo — Fresh Homemade Food Near You" },
      { name: "description", content: "Order delicious homemade meals from cooks in your neighbourhood. Delivery in 30–45 minutes." },
    ],
  }),
  component: Index,
});

async function fetchFeatured(): Promise<FoodCardData[]> {
  const { data, error } = await supabase
    .from("food_items")
    .select("id,name,price,image_url,is_veg,rating,prep_minutes,cook_id")
    .eq("is_available", true)
    .order("rating", { ascending: false })
    .limit(6);
  if (error) throw error;
  const cookIds = [...new Set((data ?? []).map((d) => d.cook_id))];
  let cooks: Record<string, { full_name: string | null; location: string | null }> = {};
  if (cookIds.length) {
    const { data: cs } = await supabase.from("profiles").select("id,full_name,location").in("id", cookIds);
    cooks = Object.fromEntries((cs ?? []).map((c) => [c.id, { full_name: c.full_name, location: c.location }]));
  }
  return (data ?? []).map((f) => ({
    id: f.id, name: f.name, price: Number(f.price), image_url: f.image_url,
    is_veg: f.is_veg, rating: Number(f.rating), prep_minutes: f.prep_minutes,
    cook_name: cooks[f.cook_id]?.full_name ?? "Home cook",
    cook_location: cooks[f.cook_id]?.location ?? null,
  }));
}

function Index() {
  const { data: foods = [] } = useQuery({ queryKey: ["featured-foods"], queryFn: fetchFeatured });

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-cream)" }} />
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-16 md:pt-20 md:pb-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-background/80 ring-1 ring-border px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Made today, by real home cooks
            </div>
            <h1 className="mt-5 font-display text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Fresh <span className="text-primary">homemade</span><br />food near you.
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-md">
              Discover meals cooked by neighbours who love what they make. Delivered warm in 30–45 minutes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/browse" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-warm)] hover:opacity-95">
                Order Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl bg-background ring-1 ring-border px-5 py-3 text-sm font-semibold hover:bg-secondary">
                <ChefHat className="h-4 w-4" /> Become a cook
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-[2rem] overflow-hidden shadow-[var(--shadow-warm)] ring-1 ring-border">
              <img src={heroFood} alt="Homemade thali" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">Featured today</h2>
            <p className="text-sm text-muted-foreground mt-1">Top-rated meals from cooks near you</p>
          </div>
          <Link to="/browse" className="text-sm font-semibold text-primary hover:underline">See all →</Link>
        </div>
        {foods.length === 0 ? (
          <div className="rounded-2xl bg-card ring-1 ring-border p-10 text-center text-muted-foreground">
            No meals available yet. <Link to="/auth" className="text-primary font-semibold">Become a cook</Link> and be the first to share.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {foods.map((f) => <FoodCard key={f.id} food={f} />)}
          </div>
        )}
      </section>

      <section className="bg-secondary/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center">How it works</h2>
          <p className="text-center text-muted-foreground mt-2">Three simple steps to a homemade meal</p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              { icon: Utensils, title: "Choose your food", desc: "Browse fresh, homemade meals from cooks in your area." },
              { icon: ShoppingBag, title: "Place your order", desc: "Add to cart, checkout in seconds with UPI." },
              { icon: Bike, title: "Get it delivered", desc: "Warm and fresh at your doorstep in 30–45 minutes." },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="relative rounded-2xl bg-card p-6 ring-1 ring-border shadow-[var(--shadow-card)]">
                  <div className="absolute -top-3 -left-3 h-10 w-10 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center justify-center shadow-[var(--shadow-warm)]">{i + 1}</div>
                  <Icon className="h-7 w-7 text-primary" />
                  <h3 className="mt-3 font-display font-semibold text-lg">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl p-8 md:p-12 text-primary-foreground relative overflow-hidden" style={{ background: "var(--gradient-warm)" }}>
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <ChefHat className="h-3.5 w-3.5" /> Earn from your kitchen
            </div>
            <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold">Cook what you love. Earn what you deserve.</h2>
            <p className="mt-3 opacity-90">Join Deligo as a home cook and share your recipes with neighbours. We handle orders, you handle the magic.</p>
            <Link to="/auth" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-background text-foreground px-5 py-3 text-sm font-semibold hover:opacity-95">
              Become a cook <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
