import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";

// Sends manager/tenant emails via Resend (RESEND_SECRET, server-only). The
// "from" address must be on a Resend-verified domain — defaults to
// noreply@<brand domain>, override with EMAIL_FROM. Falls back to a Zapier
// Catch-Hook (ZAPIER_EMAIL_WEBHOOK_URL) if that's all that's configured, so
// existing setups keep working. Returns a clear 501 until one is set.
export async function POST(req: Request) {
  let payload: { to?: string; subject?: string; body?: string; tenancyId?: string; fromName?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { to, subject, body, tenancyId, fromName } = payload;
  if (!to || !subject) {
    return NextResponse.json({ error: "Recipient and subject are required." }, { status: 400 });
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
  const text = body ?? "";

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
        body: JSON.stringify({ from, to: [to], subject, text }),
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
