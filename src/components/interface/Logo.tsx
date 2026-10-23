import { company } from "@/data/company-content";

/** Logo mark: three ascending bars. Replace with the client's SVG logo. */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className={className}>
      <defs>
        <linearGradient id="cvo-logo" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#5b8cff" />
          <stop offset="1" stopColor="#8b6bff" />
        </linearGradient>
      </defs>
      <rect x="4" y="18" width="8" height="18" rx="2.5" fill="url(#cvo-logo)" opacity="0.75" />
      <rect x="16" y="10" width="8" height="26" rx="2.5" fill="url(#cvo-logo)" opacity="0.9" />
      <rect x="28" y="3" width="8" height="33" rx="2.5" fill="url(#cvo-logo)" />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={compact ? 28 : 34} />
      <div className={`leading-tight ${compact ? "hidden sm:block" : ""}`}>
        <p className="whitespace-nowrap text-[15px] font-bold tracking-tight text-white sm:text-base">{company.name}</p>
        <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.14em] text-blue-200/80">Virtual Office</p>
      </div>
    </div>
  );
}
