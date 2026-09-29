import { brand } from "./brand";

// Standard footer appended to every outgoing email. Two jobs:
//  1. Accurate sender identification — who sent it + how to reach us. AU Spam
//     Act 2003 requires commercial electronic messages to clearly identify the
//     sender and give a way to contact them.
//  2. An opt-out for non-transactional ("notification") mail — either a signed
//     unsubscribe link, or, if no signing secret is configured, a reply-to
//     opt-out address (a functional unsubscribe facility either way).
// Transactional mail (a manager writing to their tenant, a document/notice tied
// to a live tenancy) gets the identity block but no opt-out line.
//
// Pure/deterministic so it can be unit-tested without env or network.

export interface EmailFooterOptions {
  // Present only for unsubscribable (notification) emails, when a signing
  // secret is configured. Takes precedence over optOutContact.
  unsubscribeUrl?: string | null;
  // Fallback opt-out for notification emails when no signed link is available
  // (e.g. a monitored reply-to address).
  optOutContact?: string | null;
  // Optional postal/business address line (EMAIL_BUSINESS_ADDRESS).
  businessAddress?: string | null;
}

export function emailFooter(opts: EmailFooterOptions = {}): string {
  const lines: string[] = ["—", brand.full];
  if (opts.businessAddress && opts.businessAddress.trim()) {
    lines.push(opts.businessAddress.trim());
  }
  lines.push(brand.url);
  if (opts.unsubscribeUrl) {
    lines.push("", `Unsubscribe from reminder emails: ${opts.unsubscribeUrl}`);
  } else if (opts.optOutContact) {
    lines.push("", `To stop reminder emails, reply to ${opts.optOutContact}.`);
  }
  return lines.join("\n");
}

// Append the footer to a body, collapsing any trailing whitespace so we always
// get exactly one blank line before the footer.
export function appendFooter(body: string | null | undefined, opts?: EmailFooterOptions): string {
  const trimmed = (body ?? "").replace(/\s+$/, "");
  const footer = emailFooter(opts);
  return trimmed ? `${trimmed}\n\n${footer}` : footer;
}
