import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { foods } from "@/lib/mock-data";
import { FoodCard } from "@/components/FoodCard";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse homemade food — Deligo" },
      { name: "description", content: "Browse fresh homemade meals from local cooks. Filter by veg, price, distance and rating." },
    ],
  }),
  component: Browse,
});

type VegFilter = "all" | "veg" | "nonveg";

function Browse() {
  const [veg, setVeg] = useState<VegFilter>("all");
  const [maxPrice, setMaxPrice] = useState(300);
  const [maxDist, setMaxDist] = useState(5);
  const [minRating, setMinRating] = useState(0);

  const filtered = useMemo(() => foods.filter((f) => {
    if (veg === "veg" && !f.veg) return false;
    if (veg === "nonveg" && f.veg) return false;
    if (f.price > maxPrice) return false;
    if (f.distanceKm > maxDist) return false;
    if (f.rating < minRating) return false;
    return true;
  }), [veg, maxPrice, maxDist, minRating]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl md:text-4xl font-bold">Browse meals</h1>
      <p className="text-muted-foreground mt-1">{filtered.length} fresh meals near you</p>

      <div className="mt-6 grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="lg:sticky lg:top-20 lg:self-start rounded-2xl bg-card ring-1 ring-border p-5 space-y-6">
          <div>
            <div className="text-sm font-semibold mb-2">Type</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(["all", "veg", "nonveg"] as VegFilter[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVeg(v)}
                  className={`px-2 py-1.5 text-xs rounded-lg font-medium capitalize transition ${
                    veg === v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "nonveg" ? "Non-veg" : v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm font-semibold mb-2"><span>Max price</span><span className="text-primary">₹{maxPrice}</span></div>
            <Slider value={[maxPrice]} min={50} max={500} step={10} onValueChange={(v) => setMaxPrice(v[0])} />
          </div>
          <div>
            <div className="flex justify-between text-sm font-semibold mb-2"><span>Within</span><span className="text-primary">{maxDist} km</span></div>
            <Slider value={[maxDist]} min={1} max={5} step={0.5} onValueChange={(v) => setMaxDist(v[0])} />
          </div>
          <div>
            <div className="flex justify-between text-sm font-semibold mb-2"><span>Min rating</span><span className="text-primary">{minRating.toFixed(1)}★</span></div>
            <Slider value={[minRating]} min={0} max={5} step={0.5} onValueChange={(v) => setMinRating(v[0])} />
          </div>
        </aside>

        <div>
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-card ring-1 ring-border p-10 text-center text-muted-foreground">
              No meals match these filters. Try widening your search.
            </div>
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
