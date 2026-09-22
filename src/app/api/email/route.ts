import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";

// Sends manager emails by POSTing to a Zapier "Catch Hook" webhook, which fires
// a Zap connected to Gmail / Outlook / SMS / etc. Set ZAPIER_EMAIL_WEBHOOK_URL
// (server-only env var, NOT NEXT_PUBLIC) in Vercel to the Catch Hook URL.
// The Zap maps the JSON fields below (to, subject, body, from_name) onto a send
// action. No email is sent — and a clear 501 is returned — until it's set.
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

  const webhook = process.env.ZAPIER_EMAIL_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json(
      {
        error:
          "Email isn't configured yet. Add a ZAPIER_EMAIL_WEBHOOK_URL environment variable pointing to your Zapier Catch Hook.",
      },
      { status: 501 }
    );
  }

  let status: "sent" | "failed" = "sent";
  let errorText: string | null = null;

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject,
        body: body ?? "",
        from_name: fromName ?? brand.full,
      }),
    });
    if (!res.ok) {
      status = "failed";
      errorText = `Zapier webhook returned ${res.status}`;
    }
  } catch (e) {
    status = "failed";
    errorText = e instanceof Error ? e.message : "Request to Zapier failed";
  }

  // Record the send attempt (best-effort) via a SECURITY DEFINER RPC, since this
  // route runs as anon and no longer has direct table access.
  try {
    await supabase.rpc("log_email", {
      p_tenancy_id: tenancyId ?? null,
      p_to: to,
      p_subject: subject,
      p_body: body ?? null,
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
