declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID = "G-SNS3LENQ5Q";

export function loadGoogleAnalytics(): void {
  if (typeof window === "undefined") return;
  if (window.gtag) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });
}

export function trackPageView(path: string, title?: string): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
    send_to: GA_MEASUREMENT_ID,
  });
}

export type GAEventParams = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(
  name: string,
  params: GAEventParams = {}
): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, {
    send_to: GA_MEASUREMENT_ID,
    ...params,
  });
}
