import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FoodCard, type FoodCardData } from "@/components/FoodCard";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse homemade food — Deligo" },
      { name: "description", content: "Browse fresh homemade meals from local cooks. Filter by veg, price and rating." },
    ],
  }),
  component: Browse,
});

type VegFilter = "all" | "veg" | "nonveg";

async function fetchAllFoods(): Promise<FoodCardData[]> {
  const { data, error } = await supabase
    .from("food_items")
    .select("id,name,price,image_url,is_veg,rating,prep_minutes,cook_id")
    .eq("is_available", true)
    .order("created_at", { ascending: false });
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

function Browse() {
  const { data: foods = [], isLoading } = useQuery({ queryKey: ["foods"], queryFn: fetchAllFoods });
  const [veg, setVeg] = useState<VegFilter>("all");
  const [maxPrice, setMaxPrice] = useState(500);
  const [minRating, setMinRating] = useState(0);

  const filtered = useMemo(() => foods.filter((f) => {
    if (veg === "veg" && !f.is_veg) return false;
    if (veg === "nonveg" && f.is_veg) return false;
    if (f.price > maxPrice) return false;
    if (f.rating < minRating) return false;
    return true;
  }), [foods, veg, maxPrice, minRating]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl md:text-4xl font-bold">Browse meals</h1>
      <p className="text-muted-foreground mt-1">{isLoading ? "Loading…" : `${filtered.length} fresh meals near you`}</p>

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
