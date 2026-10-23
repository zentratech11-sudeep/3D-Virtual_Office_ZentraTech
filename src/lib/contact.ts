import { isSafeEndpoint } from "./safe-url";
import { CONTACT_TOPICS, type ContactPayload } from "./validation";

/**
 * Enquiry submission (PRD FR-08). Success is only reported when a configured endpoint
 * answers with a 2xx status. Without an endpoint the visitor gets an explicit hand-off to
 * their email app — never a fake "sent" message.
 */
export type SubmitResult =
  | { status: "sent" }
  | { status: "error"; message: string; mailto: string }
  | { status: "handoff"; mailto: string };

export function buildMailto(payload: ContactPayload, recipientEmail: string): string {
  const subject = `${CONTACT_TOPICS[payload.topic]}${payload.recipient ? ` — for ${payload.recipient}` : ""} (${payload.name})`;
  const lines = [payload.message, "", `Name: ${payload.name}`, `Email: ${payload.email}`];
  if (payload.company) lines.push(`Company: ${payload.company}`);
  return `mailto:${encodeURIComponent(recipientEmail).replace("%40", "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

interface SubmitOptions {
  endpoint: string;
  recipientEmail: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export async function submitEnquiry(payload: ContactPayload, opts: SubmitOptions): Promise<SubmitResult> {
  const mailto = buildMailto(payload, opts.recipientEmail);
  if (!opts.endpoint) return { status: "handoff", mailto };
  if (!isSafeEndpoint(opts.endpoint)) return { status: "error", message: "The contact form is misconfigured. Please email us instead.", mailto };
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  try {
    const res = await doFetch(opts.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (res.ok) return { status: "sent" };
    let message = "We couldn't send your message right now.";
    try {
      const data = (await res.json()) as { error?: unknown };
      if (typeof data.error === "string" && data.error.length < 200) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 429) message = "Too many messages in a short time. Please try again in a few minutes.";
    return { status: "error", message, mailto };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return { status: "error", message: aborted ? "The request timed out. Please try again." : "Network error — check your connection and try again.", mailto };
  } finally {
    clearTimeout(timer);
  }
}
