import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHmac, timingSafeEqual } from "crypto";

const RZP_API = "https://api.razorpay.com/v1";

function basicAuth() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay keys not configured");
  return { id, secret, header: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") };
}

/**
 * Create (or recreate) a Razorpay order for an existing app order.
 * Used by the retry-checkout flow when payment is pending or failed.
 */
export const createRetryRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id,total,payment_currency,payment_status,customer_id,payment_provider")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error("Order not found");
    if (order.customer_id !== userId) throw new Error("Forbidden");
    if (order.payment_status === "paid") throw new Error("Order already paid");

    const auth = basicAuth();
    const amount = Math.round(Number(order.total) * 100); // paise
    const currency = order.payment_currency || "INR";

    const res = await fetch(`${RZP_API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth.header },
      body: JSON.stringify({
        amount, currency,
        receipt: order.id,
        notes: { app_order_id: order.id, user_id: userId },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("Razorpay order create failed:", t);
      throw new Error("Could not start payment");
    }
    const rzp = await res.json() as { id: string; amount: number; currency: string };

    await supabase.from("orders").update({
      razorpay_order_id: rzp.id,
      payment_amount: rzp.amount,
      payment_currency: rzp.currency,
      payment_provider: "razorpay",
      payment_status: "pending",
      payment_failure_reason: null,
    }).eq("id", order.id);

    return { keyId: auth.id, orderId: rzp.id, amount: rzp.amount, currency: rzp.currency };
  });

/**
 * Verify a Razorpay checkout response signature and mark the order paid.
 * The webhook is the source of truth, but this provides instant feedback.
 */
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      orderId: z.string().uuid(),
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { secret } = basicAuth();
    const payload = `${data.razorpay_order_id}|${data.razorpay_payment_id}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(data.razorpay_signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("Invalid payment signature");
    }
    const { supabase, userId } = context;
    const { error } = await supabase.from("orders").update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_signature: data.razorpay_signature,
      payment_failure_reason: null,
    }).eq("id", data.orderId).eq("customer_id", userId);
    if (error) throw error;
    return { ok: true };
  });
