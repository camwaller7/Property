"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { Field, Select } from "./Field";
import { supabase } from "@/lib/supabase";
import { usePortfolio } from "@/lib/portfolio";
import { fmtDate, toISODate } from "@/lib/format";
import {
  COMPLIANCE_KINDS,
  COMPLIANCE_KIND_LABEL,
  COMPLIANCE_DEFAULT_INTERVAL,
  COMPLIANCE_PROVIDER_HINT,
  computeNextDue,
  complianceStatus,
  type ComplianceStatus,
} from "@/lib/compliance";
import type { ComplianceItem, ComplianceKind } from "@/lib/types";

const CERT_BUCKET = "compliance-certificates";

const STATUS_TONE: Record<ComplianceStatus, "good" | "bad" | "warn" | "neutral"> = {
  ok: "good",
  due_soon: "warn",
  overdue: "bad",
  unscheduled: "neutral",
};
const STATUS_LABEL: Record<ComplianceStatus, string> = {
  ok: "Up to date",
  due_soon: "Due soon",
  overdue: "Overdue",
  unscheduled: "Not scheduled",
};

function todayIso() {
  return toISODate(new Date());
}

// Per-property compliance & safety register. Each item tracks a recurring safety
// obligation (smoke/gas/electrical/pool/blind cords/min standards) with a
// cadence, last-done + computed next-due, provider and a stored certificate.
// Landlord-only; feeds the calendar + dashboard "Compliance & safety due" tile.
export default function ComplianceRegister() {
  const { properties, complianceItems, org, saveComplianceItem, deleteComplianceItem } = usePortfolio();

  const [propertyId, setPropertyId] = useState("");
  const [kind, setKind] = useState<ComplianceKind>("smoke_alarm");
  const [label, setLabel] = useState("");
  const [provider, setProvider] = useState("");
  const [lastDone, setLastDone] = useState("");
  const [interval, setInterval] = useState<number>(COMPLIANCE_DEFAULT_INTERVAL.smoke_alarm);
  const [nextDue, setNextDue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  function pickKind(k: ComplianceKind) {
    setKind(k);
    setInterval(COMPLIANCE_DEFAULT_INTERVAL[k] ?? 12);
  }

  // next_due is explicit if given, else derived from last done + interval.
  function resolveNextDue(): string | null {
    if (nextDue) return nextDue;
    if (lastDone) return computeNextDue(lastDone, interval);
    return null;
  }

  async function uploadCertificate(): Promise<string | null> {
    if (!file) return null;
    if (!org?.id) {
      setErr("Couldn't determine your organisation for the upload.");
      return null;
    }
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${org.id}/${crypto.randomUUID()}-${safe}`;
    const up = await supabase.storage.from(CERT_BUCKET).upload(path, file);
    if (up.error) {
      setErr(`Certificate upload failed: ${up.error.message}`);
      return null;
    }
    return path;
  }

  async function add() {
    setErr("");
    setMsg("");
    if (!propertyId) return setErr("Choose a property.");
    const due = resolveNextDue();
    if (!due) return setErr("Set the last-done date (so we can schedule the next check) or a next-due date.");
    setBusy(true);
    const certificate_path = await uploadCertificate();
    if (file && !certificate_path) {
      setBusy(false);
      return; // upload error already surfaced
    }
    const res = await saveComplianceItem({
      property_id: propertyId,
      kind,
      label: label.trim() || null,
      provider: provider.trim() || null,
      last_done: lastDone || null,
      interval_months: interval,
      next_due: due,
      certificate_path,
      notes: null,
      active: true,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setLabel("");
    setProvider("");
    setLastDone("");
    setNextDue("");
    setFile(null);
    setMsg("Compliance item added ✓");
  }

  // Mark an item done today: stamp last_done and roll next_due forward.
  async function markDone(item: ComplianceItem) {
    const done = todayIso();
    await saveComplianceItem(
      {
        property_id: item.property_id,
        kind: item.kind,
        label: item.label,
        provider: item.provider,
        last_done: done,
        interval_months: item.interval_months,
        next_due: computeNextDue(done, item.interval_months),
        certificate_path: item.certificate_path,
        notes: item.notes,
        active: item.active,
      },
      item.id
    );
  }

  async function openCertificate(path: string) {
    const { data } = await supabase.storage.from(CERT_BUCKET).createSignedUrl(path, 3600);
    if (data) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const propLabel = (id: string | null) => properties.find((p) => p.id === id)?.address || "—";
  const rows = propertyId ? complianceItems.filter((c) => c.property_id === propertyId) : complianceItems;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Compliance &amp; safety</h1>
        <p className="mt-1 text-muted">
          Track recurring safety obligations per property — smoke alarms, gas, electrical, pool/spa fencing,
          corded blinds and minimum standards. Due dates flow into your calendar and the dashboard. Cadences
          vary by state, so confirm each interval against your state&apos;s rules — this isn&apos;t legal advice.
        </p>
      </header>

      {properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          Add a property first, then log its safety checks.
        </div>
      ) : (
        <>
          <section className="mb-8 rounded-2xl border border-border p-5">
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Add a compliance item</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select label="Property" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">Select a property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.address || "(no address)"}</option>
                ))}
              </Select>
              <Select label="Type" value={kind} onChange={(e) => pickKind(e.target.value as ComplianceKind)}>
                {COMPLIANCE_KINDS.map((k) => (
                  <option key={k} value={k}>{COMPLIANCE_KIND_LABEL[k]}</option>
                ))}
              </Select>
              <Field label="Last done" type="date" value={lastDone} onChange={(e) => setLastDone(e.target.value)} />
              <Field label="Interval (months)" type="number" value={String(interval)} onChange={(e) => setInterval(Math.max(1, Number(e.target.value) || 12))} />
              <Field label="Next due (optional override)" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
              <Field label="Provider" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={COMPLIANCE_PROVIDER_HINT[kind] || "Who performs the check"} />
              <Field label="Label (optional)" className="sm:col-span-2" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={COMPLIANCE_KIND_LABEL[kind]} />
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Certificate (optional)</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium"
                />
              </label>
            </div>
            <button
              onClick={add}
              disabled={busy}
              className="mt-3 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Add item"}
            </button>
            {msg && <p className="mt-2 text-sm text-good">{msg}</p>}
            {err && <p className="mt-2 text-sm text-bad">{err}</p>}
          </section>

          <section className="rounded-2xl border border-border p-5">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Register ({rows.length})</h2>
            {rows.length === 0 ? (
              <p className="text-sm text-muted">No compliance items logged yet.</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((c) => {
                  const status = complianceStatus(c);
                  return (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-sm">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                        <span className="font-medium">{c.label || COMPLIANCE_KIND_LABEL[c.kind] || "Compliance item"}</span>
                        <span className="text-xs text-muted">
                          · next {fmtDate(c.next_due)} · every {c.interval_months}mo
                          {c.last_done ? ` · last ${fmtDate(c.last_done)}` : ""}
                          {c.provider ? ` · ${c.provider}` : ""}
                          {!propertyId ? ` · ${propLabel(c.property_id)}` : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        {c.certificate_path && (
                          <button onClick={() => openCertificate(c.certificate_path!)} className="text-xs font-medium text-accent hover:underline">
                            Certificate
                          </button>
                        )}
                        <button onClick={() => markDone(c)} className="text-xs font-medium text-accent hover:underline">
                          Mark done today
                        </button>
                        <button onClick={() => deleteComplianceItem(c.id)} className="text-xs text-muted hover:text-bad">
                          Remove
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
