"use client";

import { useState } from "react";
import { Field, Select } from "./Field";
import { usePortfolio } from "@/lib/portfolio";
import type { InspectionKind } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { inspectionWindow, validateRoutineInspection } from "@/lib/sa-rules";

export default function InspectionScheduler({
  propertyId,
  tenancyId,
}: {
  propertyId: string;
  tenancyId: string;
}) {
  const { saveInspection, tenancies, properties } = usePortfolio();
  const tenancy = tenancies.find((t) => t.id === tenancyId);
  const property = properties.find((p) => p.id === propertyId);
  const tenantEmail = tenancy?.tenant_email ?? null;

  const [kind, setKind] = useState<InspectionKind>("routine");
  const [noticeDate, setNoticeDate] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notifyTenant, setNotifyTenant] = useState(true);
  const [status, setStatus] = useState("");

  // Emails the tenant an inspection reminder that points them at their portal,
  // where the full preparation checklist lives.
  async function emailReminder() {
    if (!tenantEmail) return;
    // NB: a local `window` variable (the inspection window) shadows the global
    // below, so read the origin off globalThis.
    const portalUrl = tenancy?.portal_token
      ? `${globalThis.location.origin}/portal/${tenancy.portal_token}`
      : null;
    const when = `${fmtDate(date)}${time ? ` at ${time}` : ""}`;
    const lines = [
      `Hi${tenancy?.tenant_name ? ` ${tenancy.tenant_name.split(" ")[0]}` : ""},`,
      "",
      `This is a reminder that a ${kind} inspection is scheduled for ${property?.address || "your property"} on ${when}.`,
      "",
      portalUrl
        ? `Please work through the inspection preparation checklist in your tenant portal before then: ${portalUrl}`
        : "Please make sure the property is prepared per the inspection checklist your manager provides.",
      "",
      "Thank you.",
    ];
    await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: tenantEmail,
        subject: `Inspection reminder${property?.address ? ` — ${property.address}` : ""}`,
        body: lines.join("\n"),
      }),
    }).catch(() => {});
  }

  const problems = kind === "routine" ? validateRoutineInspection(noticeDate || null, date || null) : [];
  const window = kind === "routine" && noticeDate ? inspectionWindow(noticeDate) : null;

  async function schedule() {
    if (!date) {
      setStatus("Pick an inspection date.");
      return;
    }
    setStatus("Saving…");
    const res = await saveInspection({
      property_id: propertyId,
      tenancy_id: tenancyId,
      kind,
      scheduled_date: date,
      scheduled_time: time || null,
      notice_sent_date: noticeDate || null,
      status: "scheduled",
      notes: null,
    });
    if (res.error) {
      setStatus("Couldn't save: " + res.error);
      return;
    }
    if (notifyTenant && tenantEmail) {
      await emailReminder();
      setStatus("Scheduled — reminder emailed to the tenant.");
    } else {
      setStatus("Scheduled.");
    }
    setDate("");
    setTime("");
    setNoticeDate("");
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select label="Type" value={kind} onChange={(e) => setKind(e.target.value as InspectionKind)}>
          <option value="entry">Entry / ingoing</option>
          <option value="routine">Routine</option>
          <option value="exit">Exit / outgoing</option>
        </Select>
        <Field label="Notice sent" type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} />
        <Field label="Inspection date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Field label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

      {kind === "routine" && window && (
        <p className="mt-2 text-xs text-muted">
          Valid routine window with this notice: <strong>{window.earliest}</strong> to{" "}
          <strong>{window.latest}</strong> (7–28 days).
        </p>
      )}
      {problems.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-bad">
          {problems.map((p) => (
            <li key={p}>⚠ {p}</li>
          ))}
        </ul>
      )}

      <label className="mt-3 flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={notifyTenant && !!tenantEmail}
          disabled={!tenantEmail}
          onChange={(e) => setNotifyTenant(e.target.checked)}
        />
        {tenantEmail
          ? "Email the tenant a reminder with the portal prep checklist link"
          : "Add a tenant email to send inspection reminders"}
      </label>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={schedule}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          Schedule inspection
        </button>
        {status && <span className="text-sm text-muted">{status}</span>}
      </div>
    </div>
  );
}
