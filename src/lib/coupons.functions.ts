import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const WELCOME_COUPON = "CLOUDBITES1";
export const WELCOME_DISCOUNT_PCT = 20;

export type ApplyResult =
  | { ok: true; code: string; discountPct: number; discountFlat?: number; minOrder?: number; maxDiscount?: number | null; description?: string | null }
  | { ok: false; reason: string };

export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string; subtotal: number }) => ({
    code: String(data.code || "").trim().toUpperCase(),
    subtotal: Number(data.subtotal) || 0,
  }))
  .handler(async ({ data, context }): Promise<ApplyResult> => {
    if (!data.code) return { ok: false, reason: "Enter a coupon code" };

    // Legacy hardcoded welcome coupon — first-order only
    if (data.code === WELCOME_COUPON) {
      const { data: profile, error } = await context.supabase
        .from("profiles")
        .select("first_order_coupon_used")
        .eq("id", context.userId)
        .maybeSingle();
      if (error) return { ok: false, reason: error.message };
      if (profile?.first_order_coupon_used) return { ok: false, reason: "Coupon already used — first order only" };
      return { ok: true, code: WELCOME_COUPON, discountPct: WELCOME_DISCOUNT_PCT, description: "Welcome offer" };
    }

    // DB-driven coupons
    const { data: c, error } = await context.supabase
      .from("coupons")
      .select("*")
      .eq("code", data.code)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return { ok: false, reason: error.message };
    if (!c) return { ok: false, reason: "Invalid coupon code" };

    const now = new Date();
    if (c.valid_from && new Date(c.valid_from) > now) return { ok: false, reason: "Coupon not active yet" };
    if (c.valid_until && new Date(c.valid_until) < now) return { ok: false, reason: "Coupon expired" };
    if (c.usage_limit && c.used_count >= c.usage_limit) return { ok: false, reason: "Coupon usage limit reached" };
    if (data.subtotal < Number(c.min_order_amount || 0)) {
      return { ok: false, reason: `Minimum order ₹${c.min_order_amount} required` };
    }

    // Per-user limit
    const { count } = await context.supabase
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", c.id)
      .eq("user_id", context.userId);
    if (c.per_user_limit && (count ?? 0) >= c.per_user_limit) {
      return { ok: false, reason: "You've already used this coupon" };
    }

    if (c.discount_type === "percent") {
      let pct = Number(c.discount_value);
      return {
        ok: true,
        code: c.code,
        discountPct: pct,
        maxDiscount: c.max_discount ? Number(c.max_discount) : null,
        minOrder: Number(c.min_order_amount || 0),
        description: c.description,
      };
    }
    // flat
    return {
      ok: true,
      code: c.code,
      discountPct: 0,
      discountFlat: Number(c.discount_value),
      minOrder: Number(c.min_order_amount || 0),
      description: c.description,
    };
  });

// Backward-compat alias used in older callers
export const validateWelcomeCoupon = validateCoupon;
