import { Link } from "@tanstack/react-router";
import { Star, Clock, MapPin } from "lucide-react";
import { FOOD_FALLBACK_IMAGE } from "@/lib/storage";

export type FoodCardData = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_veg: boolean;
  rating: number;
  prep_minutes: number;
  cook_name?: string | null;
  cook_location?: string | null;
};

export function VegBadge({ veg }: { veg: boolean }) {
  return (
    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 ${veg ? "border-success" : "border-destructive"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${veg ? "bg-success" : "bg-destructive"}`} />
    </span>
  );
}

export function FoodCard({ food }: { food: FoodCardData }) {
  return (
    <Link
      to="/food/$id"
      params={{ id: food.id }}
      className="group block overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)] ring-1 ring-border transition hover:-translate-y-1 hover:shadow-[var(--shadow-warm)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={food.image_url || FOOD_FALLBACK_IMAGE}
          alt={food.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FOOD_FALLBACK_IMAGE; }}
        />
        <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-medium backdrop-blur">
          <Star className="h-3 w-3 fill-warning text-warning" />
          {Number(food.rating).toFixed(1)}
        </div>
        <div className="absolute top-3 right-3 rounded-full bg-background/90 p-1.5 backdrop-blur">
          <VegBadge veg={food.is_veg} />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-base leading-tight">{food.name}</h3>
          <div className="text-base font-bold text-primary whitespace-nowrap">₹{food.price}</div>
        </div>
        {food.cook_name && <p className="mt-1 text-sm text-muted-foreground">by {food.cook_name}</p>}
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{food.prep_minutes} min</span>
          {food.cook_location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{food.cook_location}</span>}
        </div>
      </div>
    </Link>
  );
}
