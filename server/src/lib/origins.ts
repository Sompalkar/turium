// A browser sends "https://site.com" with no trailing slash, but the value pasted
// into config is often copied from the address bar with one. Accept either.
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "").toLowerCase();
}

export function parseAllowedOrigins(raw: string): string[] {
  return raw.split(",").map(normalizeOrigin).filter(Boolean);
}
