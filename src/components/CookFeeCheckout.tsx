import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCookFeeCheckout, confirmCookFeePayment } from "@/lib/cook-fee.functions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function CookFeeCheckout({ onPaid }: { onPaid: () => void }) {
  const { refresh } = useAuth();
  const [confirming, setConfirming] = useState(false);

  // If we returned from Stripe, finalize.
  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("cook_fee_session");
    if (!sessionId) return;
    setConfirming(true);
    confirmCookFeePayment({ data: { sessionId, environment: getStripeEnvironment() } })
      .then(async (r) => {
        if (r.paid) {
          await refresh();
          toast.success("Joining fee received — welcome to the kitchen!");
          url.searchParams.delete("cook_fee_session");
          window.history.replaceState({}, "", url.toString());
          onPaid();
        } else {
          toast.error(r.error ?? "Payment not completed");
        }
      })
      .finally(() => setConfirming(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const returnUrl = `${window.location.origin}/cook?cook_fee_session={CHECKOUT_SESSION_ID}`;
    const r = await createCookFeeCheckout({ data: { returnUrl, environment: getStripeEnvironment() } });
    if ("error" in r) throw new Error(r.error);
    return r.clientSecret;
  }, []);

  if (confirming) {
    return <div className="py-10 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="rounded-2xl overflow-hidden ring-1 ring-border">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
