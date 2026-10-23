/**
 * Privacy-conscious analytics hook (PRD FR-11). Only a fixed set of coarse events is
 * allowed and no personal data or movement traces are ever sent. Disabled by default:
 * enable it and connect a consent-aware provider in `analyticsConfig`.
 */
export type AnalyticsEvent = "enter_experience" | "destination_selected" | "info_card_opened" | "enquiry_submitted" | "fallback_shown";

export const analyticsConfig = {
  enabled: false,
  /** Return true only after the visitor has consented (wire to your consent manager). */
  hasConsent: () => false,
};

type Props = Record<string, string | number | boolean>;

export function track(event: AnalyticsEvent, props: Props = {}) {
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined" && window.location.search.includes("debug=1")) {
    console.info("[analytics]", event, props);
  }
  if (!analyticsConfig.enabled || !analyticsConfig.hasConsent() || typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: Array<Record<string, unknown>> };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ event: `cvo_${event}`, ...props });
}
