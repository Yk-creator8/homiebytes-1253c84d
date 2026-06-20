import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff, Trash2, Loader2, Users, ChefHat, Receipt, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { FOOD_FALLBACK_IMAGE } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — CloudBites" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { role, loading } = useAuth();
  const qc = useQueryClient();

  if (!loading && role !== "admin") {
    return (
      <div className="mx-auto max-w-md py-24 text-center px-4">
        <h1 className="font-display text-2xl font-bold">Admin only</h1>
        <p className="mt-2 text-muted-foreground">You don't have access to this area.</p>
        <Link to="/" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Back to home</Link>
      </div>
    );
  }

  const cooksQ = useQuery({
    queryKey: ["admin-cooks"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", "cook");
      if (error) throw error;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id,full_name,location,is_verified,created_at").in("id", ids);
      return profs ?? [];
    },
  });

  const foodsQ = useQuery({
    queryKey: ["admin-foods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_items").select("id,name,price,image_url,cook_id,is_veg,cuisine,created_at").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ordersQ = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id,total,status,created_at,customer_id,cook_id").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleVerify = async (id: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !current }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(!current ? "Cook verified" : "Verification removed");
    qc.invalidateQueries({ queryKey: ["admin-cooks"] });
  };

  const deleteFood = async (id: string) => {
    if (!confirm("Delete this dish? This cannot be undone.")) return;
    const { error } = await supabase.from("food_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Dish removed");
    qc.invalidateQueries({ queryKey: ["admin-foods"] });
  };

  const totalRevenue = (ordersQ.data ?? []).filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-3xl p-6 md:p-8 text-primary-foreground" style={{ background: "var(--gradient-warm)" }}>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Admin dashboard</h1>
        <p className="opacity-90 text-sm mt-1">Verify cooks, moderate content, monitor orders.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={ChefHat} label="Cooks" value={String(cooksQ.data?.length ?? 0)} />
        <Stat icon={Users} label="Verified" value={String((cooksQ.data ?? []).filter((c) => c.is_verified).length)} />
        <Stat icon={Receipt} label="Total orders" value={String(ordersQ.data?.length ?? 0)} />
        <Stat icon={IndianRupee} label="GMV (delivered)" value={`₹${totalRevenue}`} />
      </div>

      <section className="mt-8 rounded-2xl bg-card ring-1 ring-border p-5">
        <h2 className="font-display text-lg font-semibold mb-3">Cooks — verification</h2>
        {cooksQ.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
          <div className="space-y-2">
            {(cooksQ.data ?? []).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl ring-1 ring-border p-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center font-bold text-sm">
                  {(c.full_name || "C").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-1.5">
                    {c.full_name || "Unnamed cook"}
                    {c.is_verified && <ShieldCheck className="h-4 w-4 text-success" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{c.location || "No location"} · joined {new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <Link to="/cooks/$id" params={{ id: c.id }} className="text-xs font-semibold text-primary hover:underline">View</Link>
                <button onClick={() => toggleVerify(c.id, c.is_verified)} className={`inline-flex items-center gap-1 rounded-lg px-3 h-9 text-xs font-semibold ${c.is_verified ? "bg-secondary text-foreground" : "bg-success text-success-foreground"}`}>
                  {c.is_verified ? <><ShieldOff className="h-3.5 w-3.5" /> Unverify</> : <><ShieldCheck className="h-3.5 w-3.5" /> Verify</>}
                </button>
              </div>
            ))}
            {!cooksQ.isLoading && cooksQ.data?.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No cooks yet.</div>}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl bg-card ring-1 ring-border p-5">
        <h2 className="font-display text-lg font-semibold mb-3">Dishes — moderation</h2>
        {foodsQ.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
          <div className="grid sm:grid-cols-2 gap-2">
            {(foodsQ.data ?? []).map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl ring-1 ring-border p-2">
                <img src={f.image_url || FOOD_FALLBACK_IMAGE} alt={f.name} className="h-12 w-12 rounded-lg object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = FOOD_FALLBACK_IMAGE; }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-sm">{f.name}</div>
                  <div className="text-xs text-muted-foreground">₹{f.price} · {f.cuisine} · {f.is_veg ? "Veg" : "Non-veg"}</div>
                </div>
                <Link to="/food/$id" params={{ id: f.id }} className="text-xs font-semibold text-primary hover:underline">View</Link>
                <button onClick={() => deleteFood(f.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {!foodsQ.isLoading && foodsQ.data?.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center col-span-full">No dishes yet.</div>}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl bg-card ring-1 ring-border p-5">
        <h2 className="font-display text-lg font-semibold mb-3">Recent orders</h2>
        {ordersQ.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
          <div className="space-y-1.5">
            {(ordersQ.data ?? []).slice(0, 25).map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg ring-1 ring-border p-3 text-sm">
                <div className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                <div className="text-xs uppercase font-semibold text-primary">{o.status}</div>
                <div className="font-bold text-primary">₹{o.total}</div>
              </div>
            ))}
            {!ordersQ.isLoading && ordersQ.data?.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No orders yet.</div>}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-border p-4">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-2 text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
