import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";
import { appendFooter } from "@/lib/emailFooter";
import { unsubscribeUrl } from "@/lib/unsubscribeToken";
import { clientIp, rateLimitKey, EMAIL_RATE } from "@/lib/rateLimit";

// Sends manager/tenant emails via Resend (RESEND_SECRET, server-only). The
// "from" address must be on a Resend-verified domain — defaults to
// noreply@<brand domain>, override with EMAIL_FROM. Falls back to a Zapier
// Catch-Hook (ZAPIER_EMAIL_WEBHOOK_URL) if that's all that's configured, so
// existing setups keep working. Returns a clear 501 until one is set.
export async function POST(req: Request) {
  let payload: {
    to?: string;
    subject?: string;
    body?: string;
    tenancyId?: string;
    fromName?: string;
    replyTo?: string;
    token?: string;
    // "notification" = non-transactional/bulk mail (e.g. reminders): gets an
    // unsubscribe facility and is skipped for recipients who've opted out.
    // Anything else is treated as transactional (default).
    category?: "transactional" | "notification";
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { to, subject, body, tenancyId, fromName, replyTo, token, category } = payload;
  const isNotification = category === "notification";
  if (!to || !subject) {
    return NextResponse.json({ error: "Recipient and subject are required." }, { status: 400 });
  }

  // Authorise the send — this endpoint must never be an open email relay.
  // Accept any one of: the Vercel Cron secret, a valid signed-in manager
  // (Supabase access token), or a valid tenant portal token (in which case the
  // send is restricted to that tenancy's manager/owner).
  const authz = await authorizeEmail(req, token, to);
  if (!authz.ok) {
    return NextResponse.json({ error: "Not authorised to send email." }, { status: 401 });
  }

  // Volume throttle. The cron is exempt (it legitimately fans out). Everyone
  // else is capped per principal (manager id / portal token) falling back to
  // the request IP. Counting runs through the service role; if the service key
  // isn't configured we fail open rather than block real sends.
  if (authz.kind !== "cron") {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const supaUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tioeqxdulxqiptlszldp.supabase.co";
      const key =
        authz.kind && authz.id
          ? rateLimitKey("email", authz.kind, authz.id)
          : rateLimitKey("email", "ip", clientIp(req.headers.get("x-forwarded-for")));
      try {
        const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });
        const { data: allowed, error } = await admin.rpc("rate_limit_touch", {
          p_key: key,
          p_max: EMAIL_RATE.max,
          p_window_seconds: EMAIL_RATE.windowSeconds,
        });
        if (!error && allowed === false) {
          return NextResponse.json(
            { error: "Too many emails sent recently. Please try again later." },
            { status: 429 }
          );
        }
      } catch {
        // Fail open: a limiter outage must not stop legitimate mail.
      }
    }
  }

  const resendKey = process.env.RESEND_SECRET;
  const webhook = process.env.ZAPIER_EMAIL_WEBHOOK_URL;
  if (!resendKey && !webhook) {
    return NextResponse.json(
      { error: "Email isn't configured yet. Set RESEND_SECRET (recommended) or ZAPIER_EMAIL_WEBHOOK_URL." },
      { status: 501 }
    );
  }

  const fromAddress = process.env.EMAIL_FROM || `noreply@${brand.domain}`;
  const from = `${fromName ?? brand.full} <${fromAddress}>`;
  // A real reply-to (a monitored mailbox) improves deliverability and lets
  // recipients reply to a human. Falls back to EMAIL_REPLY_TO, then admin@domain.
  const reply_to = replyTo || process.env.EMAIL_REPLY_TO || `admin@${brand.domain}`;

  // Honour unsubscribes on non-transactional mail. Recipients who opted out are
  // silently skipped (reported as ok so callers/cron don't treat it as a
  // failure). Transactional mail is never suppressed.
  if (isNotification) {
    try {
      const { data: suppressed } = await supabase.rpc("is_email_suppressed", { p_email: to });
      if (suppressed === true) {
        return NextResponse.json({ ok: true, skipped: "unsubscribed" });
      }
    } catch {
      // If the check fails, err on the side of sending.
    }
  }

  // Append the sender-identity footer (all mail), plus an unsubscribe facility
  // on notification mail: a signed link when UNSUBSCRIBE_SECRET is set,
  // otherwise a reply-to opt-out address.
  const businessAddress = process.env.EMAIL_BUSINESS_ADDRESS || null;
  const unsubSecret = process.env.UNSUBSCRIBE_SECRET;
  const origin = new URL(req.url).origin;
  const unsubLink = isNotification && unsubSecret ? unsubscribeUrl(origin, to, unsubSecret) : null;
  const text = appendFooter(body, {
    businessAddress,
    unsubscribeUrl: unsubLink,
    optOutContact: isNotification && !unsubLink ? reply_to : null,
  });

  let status: "sent" | "failed" = "sent";
  let errorText: string | null = null;

  try {
    if (resendKey) {
      // Primary: Resend HTTP API.
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, text, reply_to }),
      });
      if (!res.ok) {
        status = "failed";
        let detail = `Resend returned ${res.status}`;
        try {
          const j = await res.json();
          if (j?.message) detail = j.message;
        } catch {
          /* non-JSON error body */
        }
        errorText = detail;
      }
    } else if (webhook) {
      // Fallback: Zapier Catch-Hook.
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body: text, from_name: fromName ?? brand.full }),
      });
      if (!res.ok) {
        status = "failed";
        errorText = `Zapier webhook returned ${res.status}`;
      }
    }
  } catch (e) {
    status = "failed";
    errorText = e instanceof Error ? e.message : "Email request failed";
  }

  // Record the send attempt (best-effort) via a SECURITY DEFINER RPC, since this
  // route runs as anon and no longer has direct table access.
  try {
    await supabase.rpc("log_email", {
      p_tenancy_id: tenancyId ?? null,
      p_to: to,
      p_subject: subject,
      p_body: text || null,
      p_status: status,
      p_error: errorText,
    });
  } catch {
    // logging is non-fatal
  }

  if (status === "failed") {
    return NextResponse.json({ error: errorText || "Failed to send." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

// Authorise an email send and identify the caller for rate limiting. `ok` is
// true when the caller is the cron (CRON_SECRET bearer), a signed-in manager
// (valid Supabase access token), or a tenant portal token whose tenancy
// resolves via portal_get and whose manager email matches the recipient (so a
// portal token can only notify its manager). `kind`/`id` name the principal:
// "cron" (exempt from throttling), "manager" + user id, or "portal" + token.
async function authorizeEmail(
  req: Request,
  token: string | undefined,
  to: string
): Promise<{ ok: boolean; kind?: "cron" | "manager" | "portal"; id?: string }> {
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  // 1) Cron.
  if (process.env.CRON_SECRET && bearer && bearer === process.env.CRON_SECRET) {
    return { ok: true, kind: "cron" };
  }

  // 2) Signed-in manager: validate the access token.
  if (bearer) {
    try {
      const { data, error } = await supabase.auth.getUser(bearer);
      if (!error && data?.user) return { ok: true, kind: "manager", id: data.user.id };
    } catch {
      /* fall through */
    }
  }

  // 3) Tenant portal token: must resolve, and may only email its own manager.
  if (token) {
    try {
      const { data } = await supabase.rpc("portal_get", { p_token: token });
      const payload = data as { contact?: { email?: string | null } } | null;
      if (payload) {
        const ownerEmail = payload.contact?.email ?? null;
        if (ownerEmail && ownerEmail.toLowerCase() === to.toLowerCase())
          return { ok: true, kind: "portal", id: token };
      }
    } catch {
      /* fall through */
    }
  }

  return { ok: false };
}
