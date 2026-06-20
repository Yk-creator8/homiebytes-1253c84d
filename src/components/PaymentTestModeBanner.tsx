const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full bg-red-100 border-b border-red-300 px-4 py-2 text-center text-xs text-red-800">
        Production checkout is not configured. Complete go-live in the Payments tab to accept real payments.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-xs text-orange-800">
        Payments are in test mode. Use card <span className="font-mono font-semibold">4242 4242 4242 4242</span>, any future date, any CVC.
      </div>
    );
  }
  return null;
}
