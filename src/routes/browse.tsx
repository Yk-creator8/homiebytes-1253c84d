import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FoodCard, type FoodCardData } from "@/components/FoodCard";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, X } from "lucide-react";
import { CUISINES, CUISINE_EMOJI } from "@/lib/cuisines";
import { trackEvent } from "@/lib/analytics";


export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse homemade food — HomieBytes" },
      { name: "description", content: "Browse fresh homemade meals from local cooks. Filter by cuisine, veg, price and rating." },
    ],
  }),
  component: Browse,
});

type VegFilter = "all" | "veg" | "nonveg";
type Sort = "rating" | "newest" | "price_asc" | "price_desc";

async function fetchAllFoods(): Promise<FoodCardData[]> {
  const { data, error } = await supabase
    .from("food_items")
    .select("id,name,price,image_url,is_veg,rating,prep_minutes,cuisine,cook_id,created_at")
    .eq("is_available", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const cookIds = [...new Set((data ?? []).map((d) => d.cook_id))];
  let cooks: Record<string, { full_name: string | null; location: string | null }> = {};
  if (cookIds.length) {
    const { data: cs } = await supabase.from("public_profiles").select("id,full_name,location").in("id", cookIds);
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

function Browse() {
  const { data: foods = [], isLoading } = useQuery({ queryKey: ["foods"], queryFn: fetchAllFoods });
  const [veg, setVeg] = useState<VegFilter>("all");
  const [maxPrice, setMaxPrice] = useState(500);
  const [minRating, setMinRating] = useState(0);
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("rating");

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const t = setTimeout(() => {
      trackEvent("search", { search_term: q, cuisine: cuisine ?? undefined, veg });
    }, 800);
    return () => clearTimeout(t);
  }, [query, cuisine, veg]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = foods.filter((f) => {
      if (veg === "veg" && !f.is_veg) return false;
      if (veg === "nonveg" && f.is_veg) return false;
      if (f.price > maxPrice) return false;
      if (f.rating < minRating) return false;
      if (cuisine && f.cuisine !== cuisine) return false;
      if (q && !(f.name.toLowerCase().includes(q) || (f.cook_name ?? "").toLowerCase().includes(q) || (f.cuisine ?? "").toLowerCase().includes(q))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return 0;
    });
    return list;
  }, [foods, veg, maxPrice, minRating, query, cuisine, sort]);

  // Cuisines that have at least one dish
  const availableCuisines = useMemo(() => {
    const set = new Set(foods.map((f) => f.cuisine).filter(Boolean) as string[]);
    return CUISINES.filter((c) => set.has(c));
  }, [foods]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <h1 className="font-display text-3xl md:text-4xl font-bold">Browse meals</h1>
      <p className="text-muted-foreground mt-1">{isLoading ? "Loading…" : `${filtered.length} fresh meals near you`}</p>

      {/* Search bar */}
      <div className="mt-5 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search dishes, cooks, cuisines…"
          className="w-full h-12 rounded-2xl bg-card ring-1 ring-border pl-11 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-secondary inline-flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Cuisine chips */}
      {availableCuisines.length > 0 && (
        <div className="mt-4 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 pb-1 w-max">
            <Chip active={cuisine === null} onClick={() => setCuisine(null)}>All</Chip>
            {availableCuisines.map((c) => (
              <Chip key={c} active={cuisine === c} onClick={() => setCuisine(cuisine === c ? null : c)}>
                <span className="mr-1">{CUISINE_EMOJI[c]}</span>{c}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="lg:sticky lg:top-20 lg:self-start rounded-2xl bg-card ring-1 ring-border p-5 space-y-6">
          <div>
            <div className="text-sm font-semibold mb-2">Type</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(["all", "veg", "nonveg"] as VegFilter[]).map((v) => (
                <button key={v} onClick={() => setVeg(v)} className={`px-2 py-1.5 text-xs rounded-lg font-medium capitalize transition ${
                  veg === v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}>{v === "nonveg" ? "Non-veg" : v}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">Sort by</div>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-full rounded-lg bg-background ring-1 ring-border px-3 py-2 text-sm">
              <option value="rating">Top rated</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
          <div>
            <div className="flex justify-between text-sm font-semibold mb-2"><span>Max price</span><span className="text-primary">₹{maxPrice}</span></div>
            <Slider value={[maxPrice]} min={50} max={1000} step={10} onValueChange={(v) => setMaxPrice(v[0])} />
          </div>
          <div>
            <div className="flex justify-between text-sm font-semibold mb-2"><span>Min rating</span><span className="text-primary">{minRating.toFixed(1)}★</span></div>
            <Slider value={[minRating]} min={0} max={5} step={0.5} onValueChange={(v) => setMinRating(v[0])} />
          </div>
        </aside>

        <div>
          {isLoading ? (
            <div className="rounded-2xl bg-card ring-1 ring-border p-10 text-center text-muted-foreground inline-flex items-center justify-center w-full gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading meals…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-card ring-1 ring-border p-10 text-center text-muted-foreground">No meals match these filters. Try widening your search.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((f) => <FoodCard key={f.id} food={f} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-4 h-9 rounded-full text-sm font-medium ring-1 transition ${
        active ? "bg-primary text-primary-foreground ring-primary shadow-[var(--shadow-warm)]" : "bg-card text-foreground ring-border hover:bg-secondary"
      }`}
    >{children}</button>
  );
}
