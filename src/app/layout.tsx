import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import { brand, company } from "@/data/company-content";

export const metadata: Metadata = {
  title: `${company.name} — Virtual Office`,
  description: `Explore the ${company.name} campus in 3D: walk around, meet the team, discover our services and get in touch.`,
  applicationName: `${company.name} Virtual Office`,
  openGraph: {
    title: `${company.name} — Virtual Office`,
    description: company.tagline,
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: brand.navy,
};

const brandVars = {
  "--brand-primary": brand.primary,
  "--brand-primary-dark": brand.primaryDark,
  "--brand-accent": brand.accent,
  "--brand-navy": brand.navy,
  "--brand-navy-soft": brand.navySoft,
} as CSSProperties;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={brandVars}>
      <body>{children}</body>
    </html>
  );
}
