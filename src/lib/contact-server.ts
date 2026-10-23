import { isSafeExternalUrl } from "./safe-url";
import { CONTACT_TOPICS, validateContact } from "./validation";

/**
 * Server-side enquiry handling for the optional /api/contact route. Validates input,
 * applies a honeypot + per-IP rate limit, and forwards to a webhook configured in
 * CONTACT_WEBHOOK_URL (server-only env). Pure + injectable for unit tests.
 */

export interface ContactServerDeps {
  webhookUrl: string | undefined;
  requireConsent: boolean;
  fetchImpl: typeof fetch;
  now: () => number;
  limiter: RateLimiter;
}

export interface ContactResponse {
  status: number;
  body: { ok: true } | { ok: false; error: string; fields?: Record<string, string> };
}

export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    readonly max = 5,
    readonly windowMs = 10 * 60 * 1000,
  ) {}
  allow(key: string, now: number) {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.max) {
      this.hits.set(key, list);
      return false;
    }
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 5000) this.hits.clear();
    return true;
  }
}

export async function handleContact(raw: unknown, clientKey: string, deps: ContactServerDeps): Promise<ContactResponse> {
  if (!deps.limiter.allow(clientKey, deps.now())) {
    return { status: 429, body: { ok: false, error: "Too many messages in a short time. Please try again later." } };
  }
  const v = validateContact(raw, deps.requireConsent);
  if (!v.ok) {
    if (v.errors.website) return { status: 400, body: { ok: false, error: "Your message could not be accepted." } };
    return { status: 400, body: { ok: false, error: "Please check the highlighted fields.", fields: v.errors as Record<string, string> } };
  }
  if (!deps.webhookUrl || !isSafeExternalUrl(deps.webhookUrl)) {
    return { status: 503, body: { ok: false, error: "Online enquiries aren't connected yet. Please email us instead." } };
  }
  const d = v.data;
  const summary = `New ${CONTACT_TOPICS[d.topic].toLowerCase()} from ${d.name} <${d.email}>${d.company ? ` (${d.company})` : ""}${d.recipient ? ` for ${d.recipient}` : ""}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await deps.fetchImpl(deps.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `${summary}\n\n${d.message}`,
        enquiry: { name: d.name, email: d.email, company: d.company, topic: d.topic, recipient: d.recipient, message: d.message, consent: d.consent, receivedAt: new Date(deps.now()).toISOString() },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { status: 502, body: { ok: false, error: "We couldn't deliver your message. Please try again or email us." } };
    return { status: 200, body: { ok: true } };
  } catch {
    return { status: 502, body: { ok: false, error: "We couldn't deliver your message. Please try again or email us." } };
  } finally {
    clearTimeout(timer);
  }
}
