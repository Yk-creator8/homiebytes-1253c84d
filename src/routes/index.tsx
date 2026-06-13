import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Utensils, ShoppingBag, Bike, ChefHat, Sparkles, Search, Tag, Clock, Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { FoodCard, type FoodCardData } from "@/components/FoodCard";
import { supabase } from "@/integrations/supabase/client";
import { CUISINES, CUISINE_EMOJI } from "@/lib/cuisines";
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

async function fetchHomeFoods(): Promise<FoodCardData[]> {
  const { data, error } = await supabase
    .from("food_items")
    .select("id,name,price,image_url,is_veg,rating,prep_minutes,cuisine,cook_id,created_at")
    .eq("is_available", true)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  const cookIds = [...new Set((data ?? []).map((d) => d.cook_id))];
  let cooks: Record<string, { full_name: string | null; location: string | null }> = {};
  if (cookIds.length) {
    const { data: cs } = await supabase.from("profiles").select("id,full_name,location").in("id", cookIds);
    cooks = Object.fromEntries((cs ?? []).map((c) => [c.id, { full_name: c.full_name, location: c.location }]));
  }
  return (data ?? []).map((f: any) => ({
    id: f.id, name: f.name, price: Number(f.price), image_url: f.image_url,
    is_veg: f.is_veg, rating: Number(f.rating), prep_minutes: f.prep_minutes,
    cuisine: f.cuisine ?? null,
    cook_name: cooks[f.cook_id]?.full_name ?? "Home cook",
    cook_location: cooks[f.cook_id]?.location ?? null,
  }));
}

function Index() {
  const { data: foods = [] } = useQuery({ queryKey: ["home-foods"], queryFn: fetchHomeFoods });

  const topRated = [...foods].sort((a, b) => b.rating - a.rating).slice(0, 6);
  const trending = foods.slice(0, 6); // newest = trending
  const quick = [...foods].filter((f) => f.prep_minutes <= 30).slice(0, 6);

  const availableCuisines = (() => {
    const set = new Set(foods.map((f) => f.cuisine).filter(Boolean) as string[]);
    return CUISINES.filter((c) => set.has(c));
  })();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-cream)" }} />
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-12 md:pt-20 md:pb-20 grid md:grid-cols-2 gap-10 items-center">
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

            {/* Search CTA */}
            <Link to="/browse" className="mt-6 w-full max-w-md flex items-center gap-3 rounded-2xl bg-background ring-1 ring-border px-4 h-12 text-sm text-muted-foreground shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-warm)] transition">
              <Search className="h-4 w-4 text-primary" /> Search biryani, dosa, paneer…
            </Link>

            <div className="mt-5 flex flex-wrap gap-3">
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

      {/* Promo banners */}
      <section className="mx-auto max-w-6xl px-4 pt-8">
        <div className="grid sm:grid-cols-2 gap-4">
          <PromoCard
            title="50% OFF first order"
            sub="Use code DELIGO50 at checkout"
            chip="Welcome offer"
            color="from-primary to-accent"
          />
          <PromoCard
            title="Free delivery above ₹299"
            sub="On every order, every day"
            chip="Always on"
            color="from-success to-success/70"
          />
        </div>
      </section>

      {/* Cuisine chips */}
      {availableCuisines.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-10">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-display text-xl md:text-2xl font-bold">What's on your mind?</h2>
            <Link to="/browse" className="text-sm font-semibold text-primary hover:underline">See all →</Link>
          </div>
          <div className="-mx-4 px-4 overflow-x-auto">
            <div className="flex gap-3 pb-2 w-max">
              {availableCuisines.map((c) => (
                <Link
                  key={c}
                  to="/browse"
                  className="flex flex-col items-center gap-2 w-20 group"
                >
                  <div className="h-16 w-16 rounded-2xl bg-card ring-1 ring-border inline-flex items-center justify-center text-3xl shadow-[var(--shadow-card)] group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-warm)] transition">
                    {CUISINE_EMOJI[c]}
                  </div>
                  <span className="text-xs font-medium text-center">{c}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Rails */}
      {topRated.length > 0 && (
        <Rail title="Top rated near you" icon={Flame} subtitle="Most loved by your neighbours" items={topRated} />
      )}
      {trending.length > 0 && (
        <Rail title="New on Deligo" icon={Sparkles} subtitle="Fresh additions from local cooks" items={trending} />
      )}
      {quick.length > 0 && (
        <Rail title="Ready in 30 min or less" icon={Clock} subtitle="Quick bites when you're hungry" items={quick} />
      )}

      {foods.length === 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="rounded-2xl bg-card ring-1 ring-border p-10 text-center text-muted-foreground">
            No meals available yet. <Link to="/auth" className="text-primary font-semibold">Become a cook</Link> and be the first to share.
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="bg-secondary/40 py-16 mt-10">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center">How it works</h2>
          <p className="text-center text-muted-foreground mt-2">Three simple steps to a homemade meal</p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              { icon: Utensils, title: "Choose your food", desc: "Browse fresh, homemade meals from cooks in your area." },
              { icon: ShoppingBag, title: "Place your order", desc: "Add to cart, checkout in seconds." },
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

      {/* Cook CTA */}
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

function Rail({ title, subtitle, items, icon: Icon }: { title: string; subtitle: string; items: FoodCardData[]; icon: any }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-display text-xl md:text-2xl font-bold inline-flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /> {title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <Link to="/browse" className="text-sm font-semibold text-primary hover:underline">See all →</Link>
      </div>
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="grid grid-flow-col auto-cols-[78%] sm:auto-cols-[45%] lg:auto-cols-[30%] gap-4 pb-2">
          {items.map((f) => <FoodCard key={f.id} food={f} />)}
        </div>
      </div>
    </section>
  );
}

function PromoCard({ title, sub, chip, color }: { title: string; sub: string; chip: string; color: string }) {
  return (
    <Link to="/browse" className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-5 text-primary-foreground shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-warm)] transition`}>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-2.5 py-1 text-[11px] font-semibold">
        <Tag className="h-3 w-3" /> {chip}
      </div>
      <div className="mt-3 font-display text-xl md:text-2xl font-bold leading-tight">{title}</div>
      <div className="text-sm opacity-90 mt-1">{sub}</div>
      <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 opacity-80" />
    </Link>
  );
}
