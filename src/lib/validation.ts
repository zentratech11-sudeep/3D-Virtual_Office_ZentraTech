import { z } from "zod";
import type { ContactTopic } from "@/types/experience";

export const CONTACT_TOPICS: Record<ContactTopic, string> = {
  general: "General enquiry",
  meeting: "Book a meeting",
  services: "Services",
  project: "Project enquiry",
  careers: "Careers",
};

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export function buildContactSchema(requireConsent: boolean) {
  return z
    .object({
      name: z.string().trim().min(2, "Please enter your name.").max(100, "Please keep your name under 100 characters."),
      email: z.string().trim().max(254, "That email address is too long.").regex(EMAIL_RE, "Please enter a valid email address."),
      company: z.string().trim().max(120, "Please keep the company name under 120 characters.").optional().default(""),
      topic: z.enum(Object.keys(CONTACT_TOPICS) as [ContactTopic, ...ContactTopic[]]).default("general"),
      recipient: z.string().trim().max(100).optional().default(""),
      message: z
        .string()
        .trim()
        .min(10, "Please write a message of at least 10 characters.")
        .max(2000, "Please keep your message under 2000 characters."),
      consent: z.boolean().default(false),
      /** Honeypot — real visitors never fill this in. */
      website: z.string().max(0, "Spam check failed.").optional().default(""),
    })
    .superRefine((data, ctx) => {
      if (requireConsent && !data.consent) {
        ctx.addIssue({ code: "custom", path: ["consent"], message: "Please confirm you agree so we can reply." });
      }
    });
}

export type ContactInput = z.input<ReturnType<typeof buildContactSchema>>;
export type ContactPayload = z.output<ReturnType<typeof buildContactSchema>>;
export type ContactField = "name" | "email" | "company" | "topic" | "message" | "consent" | "website";

export type ContactValidation =
  | { ok: true; data: ContactPayload }
  | { ok: false; errors: Partial<Record<ContactField, string>> };

export function validateContact(input: unknown, requireConsent: boolean): ContactValidation {
  const result = buildContactSchema(requireConsent).safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const errors: Partial<Record<ContactField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ContactField | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}
