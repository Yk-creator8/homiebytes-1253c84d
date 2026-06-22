// Razorpay Checkout loader + opener (browser only)
declare global {
  interface Window { Razorpay?: any }
}

let loaderPromise: Promise<void> | null = null;

export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay requires a browser"));
  if (window.Razorpay) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loaderPromise = null; reject(new Error("Failed to load Razorpay")); };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

export type OpenRazorpayArgs = {
  keyId: string;
  orderId: string;
  amount: number;     // paise
  currency: string;   // "INR"
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
};

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export async function openRazorpay(args: OpenRazorpayArgs): Promise<RazorpaySuccess> {
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: args.keyId,
      order_id: args.orderId,
      amount: args.amount,
      currency: args.currency,
      name: args.name ?? "HomieBytes",
      description: args.description ?? "Order payment",
      prefill: args.prefill,
      handler: (resp: RazorpaySuccess) => resolve(resp),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.on("payment.failed", (resp: any) => {
      const reason = resp?.error?.description || resp?.error?.reason || "Payment failed";
      reject(new Error(reason));
    });
    rzp.open();
  });
}
