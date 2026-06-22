import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Tag, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "flat";
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  valid_until: string | null;
  is_active: boolean;
};

const empty = {
  code: "",
  description: "",
  discount_type: "percent" as "percent" | "flat",
  discount_value: 10,
  min_order_amount: 0,
  max_discount: "" as string | number,
  usage_limit: "" as string | number,
  per_user_limit: 1,
  valid_until: "",
};

export function AdminCoupons() {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const couponsQ = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Coupon[];
    },
  });

  const create = async () => {
    if (!form.code.trim()) return toast.error("Code required");
    setBusy(true);
    const { error } = await supabase.from("coupons").insert({
      code: form.code.trim().toUpperCase(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_amount: Number(form.min_order_amount) || 0,
      max_discount: form.max_discount === "" ? null : Number(form.max_discount),
      usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
      per_user_limit: Number(form.per_user_limit) || 1,
      valid_until: form.valid_until || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Coupon created");
    setForm(empty);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  const toggle = async (c: Coupon) => {
    const { error } = await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  return (
    <section className="mt-6 rounded-2xl bg-card ring-1 ring-border p-5">
      <h2 className="font-display text-lg font-semibold mb-3 inline-flex items-center gap-2"><Tag className="h-5 w-5 text-primary" /> Coupons</h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 rounded-xl bg-secondary/40 p-3 mb-4">
        <input placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="h-9 rounded-lg bg-background ring-1 ring-border px-3 text-sm font-mono" />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-9 rounded-lg bg-background ring-1 ring-border px-3 text-sm" />
        <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })} className="h-9 rounded-lg bg-background ring-1 ring-border px-3 text-sm">
          <option value="percent">% off</option>
          <option value="flat">₹ off</option>
        </select>
        <input type="number" placeholder="Value" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} className="h-9 rounded-lg bg-background ring-1 ring-border px-3 text-sm" />
        <input type="number" placeholder="Min order ₹" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} className="h-9 rounded-lg bg-background ring-1 ring-border px-3 text-sm" />
        <input type="number" placeholder="Max discount ₹ (opt)" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className="h-9 rounded-lg bg-background ring-1 ring-border px-3 text-sm" />
        <input type="number" placeholder="Total usage limit (opt)" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="h-9 rounded-lg bg-background ring-1 ring-border px-3 text-sm" />
        <input type="number" placeholder="Per-user limit" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: Number(e.target.value) })} className="h-9 rounded-lg bg-background ring-1 ring-border px-3 text-sm" />
        <input type="date" placeholder="Expires" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="h-9 rounded-lg bg-background ring-1 ring-border px-3 text-sm" />
        <button onClick={create} disabled={busy} className="h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-50 lg:col-span-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create coupon
        </button>
      </div>

      {couponsQ.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
        <div className="space-y-1.5">
          {(couponsQ.data ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl ring-1 ring-border p-3 text-sm">
              <div className="font-mono font-bold text-primary">{c.code}</div>
              <div className="text-xs text-muted-foreground flex-1 min-w-[200px]">
                {c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                {c.min_order_amount > 0 && ` · min ₹${c.min_order_amount}`}
                {c.max_discount && ` · cap ₹${c.max_discount}`}
                {` · used ${c.used_count}${c.usage_limit ? `/${c.usage_limit}` : ""}`}
                {c.valid_until && ` · until ${new Date(c.valid_until).toLocaleDateString()}`}
              </div>
              <button onClick={() => toggle(c)} className="inline-flex items-center gap-1 text-xs font-semibold">
                {c.is_active ? <><ToggleRight className="h-5 w-5 text-success" /> Active</> : <><ToggleLeft className="h-5 w-5 text-muted-foreground" /> Off</>}
              </button>
              <button onClick={() => remove(c.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {!couponsQ.isLoading && couponsQ.data?.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No coupons yet. Create your first above.</div>}
        </div>
      )}
    </section>
  );
}
