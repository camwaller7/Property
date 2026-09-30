// Helpers for the numeric rate limiter. The actual counting happens in the
// `rate_limit_touch` Postgres RPC (service-role only); these are the pure,
// server-side pieces that build the bucket key so it can be unit-tested. The
// key is ALWAYS derived from server-verified identity (a validated manager id,
// a resolved portal token, or the request IP) — never from client-supplied
// data — so a caller can't target someone else's bucket.

export interface RateLimit {
  max: number;
  windowSeconds: number;
}

// Email send caps. Generous for a self-managed portfolio, low enough to stop
// bulk abuse if a session/token is compromised. The cron is exempt.
export const EMAIL_RATE: RateLimit = { max: 60, windowSeconds: 3600 };

// First IP in an X-Forwarded-For chain (Vercel sets this), else a fallback so
// the key is always non-empty.
export function clientIp(xForwardedFor: string | null | undefined): string {
  if (!xForwardedFor) return "unknown";
  const first = xForwardedFor.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "unknown";
}

// Build a bucket key: "<tag>:<kind>:<id>", lower-cased and whitespace-free so
// the same principal always maps to the same bucket.
export function rateLimitKey(tag: string, kind: string, id: string): string {
  const clean = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "_");
  return `${clean(tag)}:${clean(kind)}:${clean(id)}`;
}
