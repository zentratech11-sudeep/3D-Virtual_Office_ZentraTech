"use client";

import { ArrowUpRight, CircleCheck, Copy, LoaderCircle, Mail, Send, TriangleAlert } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import { company, contactSettings } from "@/data/company-content";
import { track } from "@/lib/analytics";
import { type SubmitResult, submitEnquiry } from "@/lib/contact";
import { isSafeExternalUrl } from "@/lib/safe-url";
import { CONTACT_TOPICS, type ContactField, validateContact } from "@/lib/validation";
import type { ContactTopic } from "@/types/experience";

interface Props {
  topic: ContactTopic;
  recipient: string;
  onDone: () => void;
}

type Phase =
  | { kind: "editing" }
  | { kind: "submitting" }
  | { kind: "sent" }
  | { kind: "error"; message: string; mailto: string }
  | { kind: "handoff"; mailto: string };

function toPhase(r: SubmitResult): Phase {
  if (r.status === "sent") return { kind: "sent" };
  if (r.status === "handoff") return { kind: "handoff", mailto: r.mailto };
  return { kind: "error", message: r.message, mailto: r.mailto };
}

const inputCls =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-200";

/**
 * Enquiry / meeting form (PRD FR-08). Validates on the client (and on the server when the
 * optional API route is used) and reports delivery truthfully.
 */
export function ContactForm({ topic, recipient, onDone }: Props) {
  const ids = { name: useId(), email: useId(), company: useId(), topic: useId(), message: useId(), consent: useId() };
  const [values, setValues] = useState({ name: "", email: "", company: "", topic, message: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [phase, setPhase] = useState<Phase>({ kind: "editing" });
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (submitted.current) {
      const v = validateContact({ ...next, recipient }, contactSettings.requireConsent);
      setErrors(v.ok ? {} : v.errors);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    submitted.current = true;
    const v = validateContact({ ...values, recipient }, contactSettings.requireConsent);
    if (!v.ok) {
      setErrors(v.errors);
      const first = (["name", "email", "company", "message", "consent"] as ContactField[]).find((f) => v.errors[f]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    setPhase({ kind: "submitting" });
    const result = await submitEnquiry(v.data, { endpoint: contactSettings.endpoint, recipientEmail: contactSettings.recipientEmail });
    setPhase(toPhase(result));
    if (result.status === "sent") track("enquiry_submitted", { topic: v.data.topic });
    requestAnimationFrame(() => statusRef.current?.focus());
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(`To: ${contactSettings.recipientEmail}\n\n${values.message}\n\n${values.name} <${values.email}>${values.company ? `\n${values.company}` : ""}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (phase.kind === "sent") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="flex flex-col items-center gap-3 py-6 text-center outline-none">
        <CircleCheck className="text-emerald-500" size={44} aria-hidden />
        <h3 className="text-lg font-bold text-navy">Message sent</h3>
        <p className="max-w-sm text-sm text-slate-600">Thanks, {values.name.split(" ")[0]} — your message was delivered. We usually reply within one business day.</p>
        <button type="button" onClick={onDone} className="mt-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          Back to the office
        </button>
      </div>
    );
  }

  if (phase.kind === "handoff") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="flex flex-col gap-4 outline-none">
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Mail className="mt-0.5 shrink-0" size={18} aria-hidden />
          <p>
            <strong>Your message hasn&apos;t been sent yet.</strong> This site isn&apos;t connected to an online form service, so please send it from your email app to{" "}
            <a className="font-semibold underline" href={`mailto:${contactSettings.recipientEmail}`}>
              {contactSettings.recipientEmail}
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={phase.mailto} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
            <Mail size={16} aria-hidden /> Open email app with my message
          </a>
          <button type="button" onClick={copyMessage} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Copy size={16} aria-hidden /> {copied ? "Copied" : "Copy message"}
          </button>
          <button type="button" onClick={() => setPhase({ kind: "editing" })} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Edit
          </button>
        </div>
      </div>
    );
  }

  const busy = phase.kind === "submitting";
  const showBooking = values.topic === "meeting" && contactSettings.bookingUrl && isSafeExternalUrl(contactSettings.bookingUrl);
  const err = (f: ContactField) => (errors[f] ? { "aria-invalid": true as const, "aria-describedby": `${ids[f as keyof typeof ids]}-error` } : {});
  const errorText = (f: ContactField) =>
    errors[f] ? (
      <p id={`${ids[f as keyof typeof ids]}-error`} className="mt-1 text-[13px] font-medium text-red-600">
        {errors[f]}
      </p>
    ) : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-4" aria-busy={busy}>
      {recipient && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Message for <strong className="text-navy">{recipient}</strong> at {company.name}
        </p>
      )}
      {phase.kind === "error" && (
        <div ref={statusRef} tabIndex={-1} role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 outline-none">
          <TriangleAlert className="mt-0.5 shrink-0" size={18} aria-hidden />
          <div>
            <p className="font-semibold">Your message was not sent.</p>
            <p>{phase.message}</p>
            <a href={phase.mailto} className="mt-1 inline-block font-semibold underline">
              Email us instead
            </a>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={ids.name} className="text-sm font-semibold text-slate-700">
            Name <span className="text-red-600">*</span>
          </label>
          <input id={ids.name} name="name" autoComplete="name" className={inputCls} value={values.name} onChange={(e) => set("name", e.target.value)} data-autofocus required {...err("name")} />
          {errorText("name")}
        </div>
        <div>
          <label htmlFor={ids.email} className="text-sm font-semibold text-slate-700">
            Email <span className="text-red-600">*</span>
          </label>
          <input id={ids.email} name="email" type="email" autoComplete="email" inputMode="email" className={inputCls} value={values.email} onChange={(e) => set("email", e.target.value)} required {...err("email")} />
          {errorText("email")}
        </div>
        <div>
          <label htmlFor={ids.company} className="text-sm font-semibold text-slate-700">
            Company <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input id={ids.company} name="company" autoComplete="organization" className={inputCls} value={values.company} onChange={(e) => set("company", e.target.value)} {...err("company")} />
          {errorText("company")}
        </div>
        <div>
          <label htmlFor={ids.topic} className="text-sm font-semibold text-slate-700">
            Topic
          </label>
          <select id={ids.topic} name="topic" className={inputCls} value={values.topic} onChange={(e) => set("topic", e.target.value as ContactTopic)}>
            {Object.entries(CONTACT_TOPICS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={ids.message} className="text-sm font-semibold text-slate-700">
          Message <span className="text-red-600">*</span>
        </label>
        <textarea
          id={ids.message}
          name="message"
          rows={4}
          className={inputCls}
          value={values.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder={values.topic === "meeting" ? "Suggest a few dates and times, and what you'd like to discuss." : "How can we help?"}
          required
          {...err("message")}
        />
        {errorText("message")}
      </div>
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set("website", e.target.value)} />
        </label>
      </div>
      {contactSettings.requireConsent && (
        <div>
          <label htmlFor={ids.consent} className="flex items-start gap-3 text-sm text-slate-600">
            <input id={ids.consent} name="consent" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-primary)]" checked={values.consent} onChange={(e) => set("consent", e.target.checked)} {...err("consent")} />
            <span>
              {contactSettings.consentText}
              {company.privacyPolicyUrl && isSafeExternalUrl(company.privacyPolicyUrl) && (
                <>
                  {" "}
                  <a className="font-semibold text-brand underline" href={company.privacyPolicyUrl} target="_blank" rel="noopener noreferrer">
                    Privacy policy<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </>
              )}
            </span>
          </label>
          {errorText("consent")}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-60">
          {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
          {busy ? "Sending…" : values.topic === "meeting" ? "Request meeting" : "Send message"}
        </button>
        {showBooking && (
          <a href={contactSettings.bookingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-brand underline">
            Book online <ArrowUpRight size={14} aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
        {!contactSettings.endpoint && <p className="text-xs text-slate-500">Opens your email app to send — this demo has no form service connected.</p>}
      </div>
    </form>
  );
}
