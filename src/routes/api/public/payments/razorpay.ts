import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type RzpPayment = {
  id: string;
  order_id?: string;
  status?: string;
  error_description?: string;
  error_reason?: string;
};

type RzpEvent = {
  event: string;
  payload: { payment?: { entity: RzpPayment }; order?: { entity: { id: string } } };
  created_at?: number;
  id?: string;
};

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/payments/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
          console.error("RAZORPAY_WEBHOOK_SECRET not configured");
          return new Response("Server misconfigured", { status: 500 });
        }

        const rawBody = await request.text();
        const signature = request.headers.get("x-razorpay-signature");
        if (!verifySignature(rawBody, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let evt: RzpEvent;
        try {
          evt = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: derive a stable event id
        const eventId =
          evt.id ||
          `${evt.event}:${evt.payload?.payment?.entity?.id || evt.payload?.order?.entity?.id || ""}:${evt.created_at || ""}`;

        const { error: insertErr } = await supabaseAdmin
          .from("payment_webhook_events")
          .insert({
            provider: "razorpay",
            event_id: eventId,
            event_type: evt.event,
            payload: evt as never,
          });

        // Duplicate delivery — already processed
        if (insertErr && (insertErr as { code?: string }).code === "23505") {
          return Response.json({ received: true, duplicate: true });
        }

        try {
          const payment = evt.payload?.payment?.entity;
          const rzpOrderId = payment?.order_id || evt.payload?.order?.entity?.id;
          if (!rzpOrderId) {
            await supabaseAdmin
              .from("payment_webhook_events")
              .update({ processed_at: new Date().toISOString(), error: "no order id" })
              .eq("provider", "razorpay").eq("event_id", eventId);
            return Response.json({ received: true, ignored: "no order id" });
          }

          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id,payment_status")
            .eq("razorpay_order_id", rzpOrderId)
            .maybeSingle();

          if (!order) {
            await supabaseAdmin
              .from("payment_webhook_events")
              .update({ processed_at: new Date().toISOString(), error: "order not found" })
              .eq("provider", "razorpay").eq("event_id", eventId);
            return Response.json({ received: true, ignored: "order not found" });
          }

          switch (evt.event) {
            case "payment.captured":
            case "order.paid": {
              if (order.payment_status !== "paid") {
                await supabaseAdmin
                  .from("orders")
                  .update({
                    payment_status: "paid",
                    paid_at: new Date().toISOString(),
                    razorpay_payment_id: payment?.id ?? null,
                    payment_failure_reason: null,
                  })
                  .eq("id", order.id);
              }
              break;
            }
            case "payment.failed": {
              await supabaseAdmin
                .from("orders")
                .update({
                  payment_status: "failed",
                  payment_failure_reason:
                    payment?.error_description || payment?.error_reason || "Payment failed",
                })
                .eq("id", order.id);
              break;
            }
            default:
              // Acknowledge other events without state changes
              break;
          }

          await supabaseAdmin
            .from("payment_webhook_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("provider", "razorpay").eq("event_id", eventId);

          return Response.json({ received: true });
        } catch (e) {
          console.error("Razorpay webhook handler error:", e);
          await supabaseAdmin
            .from("payment_webhook_events")
            .update({
              processed_at: new Date().toISOString(),
              error: e instanceof Error ? e.message : String(e),
            })
            .eq("provider", "razorpay").eq("event_id", eventId);
          return new Response("Webhook handler error", { status: 500 });
        }
      },
    },
  },
});
