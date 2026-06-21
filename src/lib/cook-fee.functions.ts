import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

export const COOK_JOINING_FEE_INR = 99;

type Result = { clientSecret: string } | { error: string };

export const createCookFeeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<Result> => {
    try {
      const stripe = createStripeClient(data.environment);
      const { data: user } = await context.supabase.auth.getUser();
      const email = user.user?.email;

      // Resolve the registered Stripe price by lookup_key (stable across sandbox/live).
      const prices = await stripe.prices.list({ lookup_keys: ["cook_joining_fee_onetime"], limit: 1 });
      if (!prices.data.length) throw new Error("Cook joining fee price not configured");
      const price = prices.data[0];

      // Resolve / create a Customer carrying userId metadata so later reads work.
      let customerId: string;
      const existing = await stripe.customers.search({
        query: `metadata['userId']:'${context.userId}'`,
        limit: 1,
      }).catch(() => ({ data: [] as Array<{ id: string }> }));
      if (existing.data.length) {
        customerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({
          ...(email && { email }),
          metadata: { userId: context.userId },
        });
        customerId = created.id;
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: { description: "CloudBites Cook Joining Fee" },
        metadata: { userId: context.userId, kind: "cook_joining_fee" },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

type ConfirmResult = { paid: boolean; status?: string; error?: string };

export const confirmCookFeePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<ConfirmResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      if (session.metadata?.userId !== context.userId) return { paid: false, error: "Session does not belong to user" };
      const paid = session.payment_status === "paid";
      if (paid) {
        await context.supabase
          .from("profiles")
          .update({ cook_fee_paid: true, cook_fee_paid_at: new Date().toISOString() })
          .eq("id", context.userId);
      }
      return { paid, status: session.payment_status ?? undefined };
    } catch (e) {
      return { paid: false, error: getStripeErrorMessage(e) };
    }
  });
