import { describe, expect, it } from "vitest";
import { isSafeEndpoint, isSafeExternalUrl, isSafeHref } from "@/lib/safe-url";
import { validateContact } from "@/lib/validation";

const valid = { name: "Ada Lovelace", email: "ada@example.com", company: "", topic: "general", message: "Hello, I'd like to talk about a project.", consent: true, website: "" };

describe("contact form validation", () => {
  it("accepts a complete enquiry and trims values", () => {
    const r = validateContact({ ...valid, name: "  Ada Lovelace  " }, true);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.name).toBe("Ada Lovelace");
  });

  it("reports each invalid field", () => {
    const r = validateContact({ ...valid, name: "A", email: "not-an-email", message: "short", consent: false }, true);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(["consent", "email", "message", "name"]);
    }
  });

  it("only requires consent when configured", () => {
    expect(validateContact({ ...valid, consent: false }, false).ok).toBe(true);
    expect(validateContact({ ...valid, consent: false }, true).ok).toBe(false);
  });

  it("rejects the honeypot field", () => {
    const r = validateContact({ ...valid, website: "http://spam.example" }, true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.website).toBeDefined();
  });

  it("rejects unknown topics and over-long messages", () => {
    expect(validateContact({ ...valid, topic: "lottery" }, true).ok).toBe(false);
    expect(validateContact({ ...valid, message: "x".repeat(2001) }, true).ok).toBe(false);
  });

  it("rejects addresses with spaces or missing domains", () => {
    for (const email of ["a b@example.com", "ada@", "@example.com", "ada@example", "ada@example.c"]) {
      expect(validateContact({ ...valid, email }, true).ok, email).toBe(false);
    }
  });
});

describe("safe URL checks", () => {
  it("allows only https external links", () => {
    expect(isSafeExternalUrl("https://example.com/path?q=1")).toBe(true);
    expect(isSafeExternalUrl("http://example.com")).toBe(false);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("data:text/html,hi")).toBe(false);
    expect(isSafeExternalUrl("https://user:pass@example.com")).toBe(false);
    expect(isSafeExternalUrl(" https://example.com")).toBe(false);
  });

  it("allows same-origin paths, fragments, mailto and tel hrefs", () => {
    expect(isSafeHref("/images/projects/atlas.svg")).toBe(true);
    expect(isSafeHref("#section-team")).toBe(true);
    expect(isSafeHref("mailto:hello@yourcompany.example?subject=Hi")).toBe(true);
    expect(isSafeHref("tel:+44 20 1234 5678")).toBe(true);
    expect(isSafeHref("//evil.example/x")).toBe(false);
    expect(isSafeHref("javascript:void(0)")).toBe(false);
  });

  it("validates form endpoints", () => {
    expect(isSafeEndpoint("/api/contact")).toBe(true);
    expect(isSafeEndpoint("https://formspree.io/f/abc")).toBe(true);
    expect(isSafeEndpoint("http://insecure.example")).toBe(false);
    expect(isSafeEndpoint("")).toBe(false);
  });
});
