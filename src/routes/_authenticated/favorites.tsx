import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Loader2 } from "lucide-react";
import { FoodCard, type FoodCardData } from "@/components/FoodCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "Your favorites — Deligo" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-favorites", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FoodCardData[]> => {
      const { data: favs } = await supabase.from("favorites").select("food_id").eq("user_id", user!.id);
      const ids = (favs ?? []).map((f) => f.food_id);
      if (!ids.length) return [];
      const { data: items } = await supabase
        .from("food_items")
        .select("id,name,price,image_url,is_veg,rating,prep_minutes,cuisine,cook_id")
        .in("id", ids);
      const cookIds = [...new Set((items ?? []).map((i) => i.cook_id))];
      let cooks: Record<string, { full_name: string | null; location: string | null }> = {};
      if (cookIds.length) {
        const { data: cs } = await supabase.from("profiles").select("id,full_name,location").in("id", cookIds);
        cooks = Object.fromEntries((cs ?? []).map((c) => [c.id, { full_name: c.full_name, location: c.location }]));
      }
      return (items ?? []).map((f: any) => ({
        id: f.id, name: f.name, price: Number(f.price), image_url: f.image_url,
        is_veg: f.is_veg, rating: Number(f.rating), prep_minutes: f.prep_minutes,
        cuisine: f.cuisine ?? null,
        cook_name: cooks[f.cook_id]?.full_name ?? "Home cook",
        cook_location: cooks[f.cook_id]?.location ?? null,
      }));
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl md:text-4xl font-bold inline-flex items-center gap-2">
        <Heart className="h-7 w-7 text-destructive fill-destructive" /> Your favorites
      </h1>
      <p className="text-muted-foreground mt-1">Saved dishes you love</p>

      <div className="mt-6">
        {isLoading ? (
          <div className="text-center text-muted-foreground inline-flex w-full justify-center items-center gap-2 py-12"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl bg-card ring-1 ring-border p-10 text-center text-muted-foreground">
            No favorites yet. Tap the heart on any dish to save it.<br />
            <Link to="/browse" className="mt-3 inline-block text-primary font-semibold">Browse meals →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {data.map((f) => <FoodCard key={f.id} food={f} />)}
          </div>
        )}
      </div>
    </div>
  );
}
