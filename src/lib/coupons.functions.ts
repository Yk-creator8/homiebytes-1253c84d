import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const WELCOME_COUPON = "CLOUDBITES1";
export const WELCOME_DISCOUNT_PCT = 20;

type ApplyResult =
  | { ok: true; code: string; discountPct: number }
  | { ok: false; reason: string };

export const validateWelcomeCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => ({ code: String(data.code || "").trim().toUpperCase() }))
  .handler(async ({ data, context }): Promise<ApplyResult> => {
    if (data.code !== WELCOME_COUPON) return { ok: false, reason: "Invalid coupon code" };
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("first_order_coupon_used")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) return { ok: false, reason: error.message };
    if (profile?.first_order_coupon_used) return { ok: false, reason: "Coupon already used — first order only" };
    return { ok: true, code: WELCOME_COUPON, discountPct: WELCOME_DISCOUNT_PCT };
  });
