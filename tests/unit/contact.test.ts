import { describe, expect, it, vi } from "vitest";
import { buildMailto, submitEnquiry } from "@/lib/contact";
import { RateLimiter, handleContact } from "@/lib/contact-server";
import type { ContactPayload } from "@/lib/validation";

const payload: ContactPayload = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  company: "Analytical Engines",
  topic: "meeting",
  recipient: "Sarah Johnson",
  message: "Could we meet next week to discuss a new product?",
  consent: true,
  website: "",
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("client enquiry submission", () => {
  it("never reports success without an endpoint — it hands off to email", async () => {
    const fetchImpl = vi.fn();
    const r = await submitEnquiry(payload, { endpoint: "", recipientEmail: "hello@yourcompany.example", fetchImpl });
    expect(r.status).toBe("handoff");
    expect(fetchImpl).not.toHaveBeenCalled();
    if (r.status === "handoff") {
      expect(r.mailto.startsWith("mailto:hello@yourcompany.example?subject=")).toBe(true);
      expect(decodeURIComponent(r.mailto)).toContain("Could we meet next week");
    }
  });

  it("reports success only for 2xx responses", async () => {
    const ok = await submitEnquiry(payload, { endpoint: "/api/contact", recipientEmail: "x@y.example", fetchImpl: vi.fn().mockResolvedValue(json(200, { ok: true })) });
    expect(ok.status).toBe("sent");
    const fail = await submitEnquiry(payload, { endpoint: "/api/contact", recipientEmail: "x@y.example", fetchImpl: vi.fn().mockResolvedValue(json(503, { ok: false, error: "Not connected." })) });
    expect(fail).toMatchObject({ status: "error", message: "Not connected." });
  });

  it("reports network failures and rate limiting as errors", async () => {
    const net = await submitEnquiry(payload, { endpoint: "/api/contact", recipientEmail: "x@y.example", fetchImpl: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) });
    expect(net.status).toBe("error");
    const limited = await submitEnquiry(payload, { endpoint: "/api/contact", recipientEmail: "x@y.example", fetchImpl: vi.fn().mockResolvedValue(json(429, {})) });
    expect(limited).toMatchObject({ status: "error" });
    if (limited.status === "error") expect(limited.message).toMatch(/too many/i);
  });

  it("refuses unsafe endpoints", async () => {
    const fetchImpl = vi.fn();
    const r = await submitEnquiry(payload, { endpoint: "http://insecure.example/form", recipientEmail: "x@y.example", fetchImpl });
    expect(r.status).toBe("error");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("builds a mailto link with subject and body", () => {
    const m = buildMailto(payload, "hello@yourcompany.example");
    expect(m).toContain("subject=Book%20a%20meeting");
    expect(decodeURIComponent(m)).toContain("Company: Analytical Engines");
  });
});

describe("server contact route", () => {
  const deps = (overrides: Partial<Parameters<typeof handleContact>[2]> = {}) => ({
    webhookUrl: "https://hooks.example.com/abc",
    requireConsent: true,
    fetchImpl: vi.fn().mockResolvedValue(new Response("ok", { status: 200 })),
    now: () => 1_000_000,
    limiter: new RateLimiter(5, 60_000),
    ...overrides,
  });

  it("responds 503 when delivery isn't configured", async () => {
    const r = await handleContact(payload, "1.1.1.1", deps({ webhookUrl: undefined }));
    expect(r.status).toBe(503);
    expect(r.body.ok).toBe(false);
  });

  it("validates input on the server", async () => {
    const r = await handleContact({ ...payload, email: "nope" }, "1.1.1.1", deps());
    expect(r.status).toBe(400);
    if (!r.body.ok) expect(r.body.fields?.email).toBeDefined();
  });

  it("rejects honeypot submissions without echoing why", async () => {
    const d = deps();
    const r = await handleContact({ ...payload, website: "spam" }, "1.1.1.1", d);
    expect(r.status).toBe(400);
    expect(d.fetchImpl).not.toHaveBeenCalled();
  });

  it("forwards valid enquiries and reports webhook failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    const d = deps({ fetchImpl });
    expect((await handleContact(payload, "1.1.1.1", d)).status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const body = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
    expect(body.enquiry.email).toBe("ada@example.com");
    const failing = deps({ fetchImpl: vi.fn().mockResolvedValue(new Response("nope", { status: 500 })) });
    expect((await handleContact(payload, "1.1.1.1", failing)).status).toBe(502);
  });

  it("rate limits repeated submissions per client", async () => {
    const d = deps({ limiter: new RateLimiter(2, 60_000) });
    expect((await handleContact(payload, "9.9.9.9", d)).status).toBe(200);
    expect((await handleContact(payload, "9.9.9.9", d)).status).toBe(200);
    expect((await handleContact(payload, "9.9.9.9", d)).status).toBe(429);
    expect((await handleContact(payload, "8.8.8.8", d)).status).toBe(200);
  });
});
