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
      const session = await stripe.checkout.sessions.create({
        line_items: [{
          price_data: {
            currency: "inr",
            product_data: { name: "CloudBites Cook Joining Fee", description: "One-time cloud-kitchen onboarding fee" },
            unit_amount: COOK_JOINING_FEE_INR * 100,
          },
          quantity: 1,
        }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        payment_intent_data: { description: "CloudBites Cook Joining Fee" },
        ...(email && { customer_email: email }),
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
