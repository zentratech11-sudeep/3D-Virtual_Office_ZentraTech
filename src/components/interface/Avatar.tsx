import { getDepartment } from "@/lib/organization";
import type { Person } from "@/types/organization";
import { lookFor } from "@/world/office";

/**
 * Illustrated portrait generated from the person's 3D look (skin, hair, outfit) on a
 * team-coloured background — no photos needed, nothing personal stored.
 */
export function Avatar({ person, size = 48, ring = true }: { person: Person; size?: number; ring?: boolean }) {
  const look = lookFor(person);
  const color = getDepartment(person.departmentId)?.color ?? "#2f6bff";
  const long = look.hairStyle === "long";
  const bun = look.hairStyle === "bun";
  return (
    <span
      role="img"
      aria-label={`Avatar of ${person.name}`}
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full ${ring ? "ring-4 ring-slate-100" : ""}`}
      style={{ width: size, height: size, background: `${color}26` }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
        <circle cx="32" cy="32" r="32" fill={color} opacity="0.22" />
        {long && <path d="M17 30c0-11 7-18 15-18s15 7 15 18v16H17z" fill={look.hair} />}
        <path d="M10 64c1-12 10-19 22-19s21 7 22 19z" fill={look.shirt} />
        {look.jacket && <path d="M27 46l5 9 5-9" fill="none" stroke="#f4f5f7" strokeWidth="3" strokeLinejoin="round" />}
        <rect x="27.5" y="37" width="9" height="9" rx="3" fill={look.skin} />
        <ellipse cx="32" cy="29" rx="11" ry="12.5" fill={look.skin} />
        <path d="M20.5 27c0-8 5-13.5 11.5-13.5S43.5 19 43.5 27c-3-4-7-6-11.5-6s-8.5 2-11.5 6z" fill={look.hair} />
        {bun && <circle cx="32" cy="13" r="5" fill={look.hair} />}
        <circle cx="27.8" cy="30" r="1.3" fill="#1f2430" />
        <circle cx="36.2" cy="30" r="1.3" fill="#1f2430" />
        <path d="M28.5 35.2c2.2 1.6 4.8 1.6 7 0" fill="none" stroke="#7a4a3a" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </span>
  );
}
