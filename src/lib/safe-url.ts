/**
 * URL safety helpers. Content links must use safe protocols (TRD §4, §10).
 */

/** External links: absolute https URLs only. */
export function isSafeExternalUrl(href: string): boolean {
  if (typeof href !== "string" || href.trim() !== href || href.length > 2048) return false;
  try {
    const url = new URL(href);
    return url.protocol === "https:" && url.hostname.length > 0 && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Any href rendered from content: https, mailto, tel, same-origin paths or fragments. */
export function isSafeHref(href: string): boolean {
  if (typeof href !== "string" || href.length === 0 || href.length > 2048) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return !/[\s\\]/.test(href);
  if (href.startsWith("#")) return /^#[\w-]*$/.test(href);
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(href.split("?")[0])) return true;
  if (/^tel:\+?[\d\s-]{3,20}$/i.test(href)) return true;
  return isSafeExternalUrl(href);
}

/** Endpoint for form submissions: https absolute or same-origin path. */
export function isSafeEndpoint(href: string): boolean {
  if (!href) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return /^\/[\w\-/.]*$/.test(href);
  return isSafeExternalUrl(href);
}
