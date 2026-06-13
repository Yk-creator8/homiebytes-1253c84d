import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck, Star, MapPin, Loader2, ChefHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FoodCard } from "@/components/FoodCard";

export const Route = createFileRoute("/cooks/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Home cook — Deligo" },
      { name: "description", content: "View this home cook's full menu, ratings, and reviews on Deligo." },
      { property: "og:title", content: "Home cook on Deligo" },
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md py-24 text-center px-4">
      <h1 className="text-2xl font-bold">Cook not found</h1>
      <Link to="/browse" className="mt-4 inline-block text-primary font-semibold">Browse meals →</Link>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
  component: CookProfile,
});

async function fetchCook(id: string) {
  const { data: cook, error } = await supabase
    .from("profiles")
    .select("id,full_name,location,avatar_url,is_verified,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!cook) throw notFound();
  const { data: menu } = await supabase
    .from("food_items")
    .select("*")
    .eq("cook_id", id)
    .eq("is_available", true)
    .order("created_at", { ascending: false });
  return { cook, menu: menu ?? [] };
}

function CookProfile() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["cook-profile", id], queryFn: () => fetchCook(id) });

  if (isLoading) return <div className="p-12 text-center text-muted-foreground inline-flex items-center justify-center gap-2 w-full"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (!data) return null;
  const { cook, menu } = data;

  const avgRating = menu.length ? menu.reduce((s, m) => s + Number(m.rating), 0) / menu.length : 0;
  const initials = (cook.full_name || "Cook").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>

      <div className="rounded-3xl p-6 md:p-8 text-primary-foreground" style={{ background: "var(--gradient-warm)" }}>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur inline-flex items-center justify-center text-3xl font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl md:text-3xl font-bold truncate">{cook.full_name || "Home cook"}</h1>
              {cook.is_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 text-xs font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm opacity-90 flex-wrap">
              {cook.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {cook.location}</span>}
              {menu.length > 0 && <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-white" /> {avgRating.toFixed(1)}</span>}
              <span className="inline-flex items-center gap-1"><ChefHat className="h-4 w-4" /> {menu.length} dish{menu.length === 1 ? "" : "es"}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-bold mb-4">Menu</h2>
        {menu.length === 0 ? (
          <div className="rounded-2xl bg-card ring-1 ring-border p-12 text-center text-muted-foreground">
            This cook hasn't published any dishes yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {menu.map((m) => (
              <FoodCard key={m.id} food={{
                id: m.id, name: m.name, price: Number(m.price), image: m.image_url ?? "",
                cookId: m.cook_id, cookName: cook.full_name ?? "Home cook", rating: Number(m.rating),
                prepMin: m.prep_minutes, isVeg: m.is_veg, cuisine: m.cuisine,
                location: cook.location ?? "",
              }} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
