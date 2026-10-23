/**
 * Company identity, brand and contact settings — the first file to edit for a new client.
 * Kept dependency-free so every other data module can import it.
 */

export const company = {
  name: "Zentra Tech",
  shortName: "ZT",
  /** Text on the 3D building signage (defaults to the upper-cased name). */
  signText: "",
  tagline: "Digital products, designed and engineered together.",
  description: "",
  founded: 2012,
  headcount: "120+ people",
  locations: ["Harbour Campus", "Remote across 9 countries"],
  address: "1 Harbour Way, Waterfront District",
  /** Placeholder address on a reserved domain — replace before launch. */
  email: "hello@yourcompany.example",
  phone: "+00 000 000 000",
  hours: "Monday–Friday, 8:30–18:00",
  privacyPolicyUrl: "",
  socials: [] as Array<{ label: string; href: string }>,
};
company.description = `${company.name} is a product studio of strategists, designers and engineers. We help ambitious organisations plan, build and grow digital products that people love to use.`;

export const companySignText = () => (company.signText || company.name).toUpperCase();

export const brand = {
  primary: "#2f6bff",
  primaryDark: "#1d4fd8",
  accent: "#7c5cff",
  navy: "#0b1630",
  navySoft: "#13224a",
};

/**
 * Contact delivery. `NEXT_PUBLIC_CONTACT_ENDPOINT` (build-time) enables JSON POST
 * submission; without it the form hands off to the visitor's email client and says so.
 */
export const contactSettings = {
  endpoint: process.env.NEXT_PUBLIC_CONTACT_ENDPOINT ?? "",
  recipientEmail: company.email,
  requireConsent: true,
  consentText: `I agree that ${company.name} may use these details to reply to my enquiry. We never share them with third parties.`,
  /** Optional external booking page (https). Leave empty to use the meeting request form. */
  bookingUrl: "",
};
