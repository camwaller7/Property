import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { brand } from "@/lib/brand";
import { REMINDER_DAYS } from "@/lib/inspections";

// Daily cron (see vercel.json) that sends inspection reminder emails a month,
// a fortnight and 3 days before each scheduled inspection, to everyone on the
// lease. Idempotent via inspection_reminders_sent. Protected by CRON_SECRET —
// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
//
// Requires (server-only): CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY,
// NEXT_PUBLIC_SUPABASE_URL, and RESEND_SECRET (for the /api/email send).

// Today (+offset days) as YYYY-MM-DD in the operating timezone, so "3 days
// before" lines up with the local calendar rather than UTC.
function localDatePlus(days: number): string {
  const shifted = new Date(Date.now() + days * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Adelaide",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const supaUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tioeqxdulxqiptlszldp.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!cronSecret || !serviceKey) {
    return NextResponse.json(
      { error: "Reminder cron not configured. Set CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 501 }
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });
  const origin = new URL(req.url).origin;

  let sent = 0;
  let processed = 0;

  for (const days of REMINDER_DAYS) {
    const target = localDatePlus(days);
    const { data: insps, error } = await admin
      .from("inspections")
      .select("id, kind, scheduled_date, scheduled_time, tenancy_id, property_id")
      .eq("status", "scheduled")
      .eq("scheduled_date", target);
    if (error || !insps) continue;

    for (const insp of insps) {
      // Skip if this reminder already went out.
      const { data: already } = await admin
        .from("inspection_reminders_sent")
        .select("inspection_id")
        .eq("inspection_id", insp.id)
        .eq("days_before", days)
        .maybeSingle();
      if (already) continue;

      processed++;

      const { data: ten } = await admin
        .from("tenancies")
        .select("tenant_email, portal_token")
        .eq("id", insp.tenancy_id)
        .maybeSingle();
      const { data: lts } = await admin
        .from("lease_tenants")
        .select("email")
        .eq("tenancy_id", insp.tenancy_id);
      const { data: prop } = insp.property_id
        ? await admin.from("properties").select("address").eq("id", insp.property_id).maybeSingle()
        : { data: null };

      const emails = Array.from(
        new Set(
          [ten?.tenant_email, ...((lts ?? []).map((l: { email: string | null }) => l.email))]
            .map((e) => e?.trim())
            .filter((e): e is string => !!e)
        )
      );

      if (emails.length > 0) {
        const address = (prop as { address?: string | null } | null)?.address ?? "your property";
        const when = insp.scheduled_date + (insp.scheduled_time ? ` at ${insp.scheduled_time}` : "");
        const portalUrl = ten?.portal_token ? `${origin}/portal/${ten.portal_token}` : null;
        const subject = `Reminder: ${insp.kind} inspection in ${days} days — ${address}`;
        const body =
          `This is a reminder that a ${insp.kind} inspection at ${address} is scheduled for ${when} ` +
          `(in ${days} days).\n\n` +
          (portalUrl
            ? `There's a preparation checklist in your tenant portal:\n${portalUrl}\n\n`
            : "") +
          `— ${brand.full}`;
        await Promise.all(
          emails.map((to) =>
            fetch(`${origin}/api/email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to, subject, body, tenancyId: insp.tenancy_id }),
            }).catch(() => {})
          )
        );
        sent += emails.length;
      }

      // Record it as handled (even with no recipients) so it isn't reprocessed.
      await admin
        .from("inspection_reminders_sent")
        .insert({ inspection_id: insp.id, days_before: days });
    }
  }

  return NextResponse.json({ ok: true, processed, sent });
}
