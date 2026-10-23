import { contactSettings } from "@/data/company-content";
import { RateLimiter, handleContact } from "@/lib/contact-server";

/**
 * Optional enquiry endpoint. Enable it with NEXT_PUBLIC_CONTACT_ENDPOINT=/api/contact and
 * set CONTACT_WEBHOOK_URL (server-only) to the delivery webhook. Responds 503 until then.
 * Note: the in-memory rate limit is per server instance; use a shared store for multi-instance hosting.
 */
const limiter = new RateLimiter(5, 10 * 60 * 1000);
const MAX_BODY_BYTES = 12_000;

export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    return Response.json({ ok: false, error: "Expected a JSON body." }, { status: 415 });
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return Response.json({ ok: false, error: "Message is too large." }, { status: 413 });
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const result = await handleContact(raw, ip, {
    webhookUrl: process.env.CONTACT_WEBHOOK_URL,
    requireConsent: contactSettings.requireConsent,
    fetchImpl: fetch,
    now: Date.now,
    limiter,
  });
  return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
