import { createHmac, timingSafeEqual } from "node:crypto";

// Server-only. Signs/verifies the per-recipient unsubscribe token so a public
// unsubscribe link can't be forged to opt out an arbitrary address. The secret
// (UNSUBSCRIBE_SECRET) lives only in the server env; the DB never sees it.
//
// The token is HMAC-SHA256(lowercased email, secret), hex, truncated to 32
// chars — short enough for a tidy URL, long enough (128 bits) to be
// unguessable.

export function signUnsubscribe(email: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribe(email: string, token: string, secret: string): boolean {
  if (!email || !token || !secret) return false;
  const expected = signUnsubscribe(email, secret);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Build the public unsubscribe URL for a recipient. `base` is the site origin.
export function unsubscribeUrl(base: string, email: string, secret: string): string {
  const t = signUnsubscribe(email, secret);
  return `${base.replace(/\/$/, "")}/unsubscribe?e=${encodeURIComponent(email)}&t=${t}`;
}
