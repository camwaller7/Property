"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import ApplicationPanel from "./ApplicationPanel";
import PortalPanel from "./PortalPanel";
import InspectionScheduler from "./InspectionScheduler";
import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio";
import type { Inspection, Tenancy } from "@/lib/types";
import { fmtDate, fmtMoney } from "@/lib/format";
import { maxBond, jurisdiction } from "@/lib/jurisdictions";
import { hasDocuments } from "@/lib/plans";
import { docForOnboardingKey } from "@/lib/documents";

const statusTone = { upcoming: "warn", active: "good", ended: "neutral" } as const;

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function TenancyCard({
  tenancy,
  onEdit,
}: {
  tenancy: Tenancy;
  onEdit: (t: Tenancy) => void;
}) {
  const { properties, inspections, setOnboarding, saveInspection, endTenancy, transferTenancy, conditionReports, issueConditionReport, deleteConditionReport, org } = usePortfolio();
  const [open, setOpen] = useState(true);
  const [ending, setEnding] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferMoveIn, setTransferMoveIn] = useState(todayIso());
  const [transferRent, setTransferRent] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferErr, setTransferErr] = useState("");
  const [crKind, setCrKind] = useState<"ingoing" | "outgoing">("ingoing");
  const [crNotes, setCrNotes] = useState("");
  const [crFile, setCrFile] = useState<File | null>(null);
  const [crBusy, setCrBusy] = useState(false);
  const [crErr, setCrErr] = useState("");

  async function issueReport() {
    setCrErr("");
    setCrBusy(true);
    const res = await issueConditionReport({
      tenancyId: tenancy.id,
      propertyId: tenancy.property_id,
      kind: crKind,
      notes: crNotes,
      file: crFile,
    });
    setCrBusy(false);
    if (res.error) return setCrErr(res.error);
    setCrNotes("");
    setCrFile(null);
  }

  async function handleEnd() {
    if (!globalThis.confirm?.("End this tenancy? The tenant's portal will switch to a past-tenancy record and live details will be hidden. Your records are kept.")) return;
    const note = globalThis.prompt?.("Optional reference note for their rental history (conduct, payment record, etc.) — leave blank to skip:") ?? "";
    setEnding(true);
    await endTenancy(tenancy.id, note || undefined);
    setEnding(false);
  }

  async function handleTransfer() {
    setTransferErr("");
    if (!transferTo) {
      setTransferErr("Choose the property to transfer them to.");
      return;
    }
    setTransferring(true);
    const rent = transferRent.trim() === "" ? null : Number(transferRent);
    const res = await transferTenancy(tenancy.id, {
      newPropertyId: transferTo,
      moveInDate: transferMoveIn || null,
      leaseStart: transferMoveIn || null,
      weeklyRent: rent != null && !Number.isNaN(rent) ? rent : null,
      conductNote: transferNote.trim() || undefined,
    });
    setTransferring(false);
    if (res.error) {
      setTransferErr(res.error);
      return;
    }
    setTransferOpen(false);
  }

  const t = tenancy;
  const property = properties.find((p) => p.id === t.property_id);
  // Other properties in the portfolio this tenant could be transferred to.
  const otherProperties = properties.filter((p) => p.id !== t.property_id);
  const myReports = conditionReports
    .filter((r) => r.tenancy_id === t.id)
    .sort((a, b) => (b.issued_at || "").localeCompare(a.issued_at || ""));
  const items = t.onboarding || [];
  const doneCount = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const myInspections = inspections
    .filter((i) => i.tenancy_id === t.id)
    .sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || ""));

  const cap = maxBond(t.weekly_rent, property?.state);
  const docsUnlocked = hasDocuments(org?.plan, org?.subscription_status);
  const juris = jurisdiction(property?.state);

  // The contextual document/link for an onboarding step (paid plans with the
  // document library — Plus and Pro).
  function docActionFor(key: string): { label: string; href: string; external?: boolean } | null {
    if (!docsUnlocked) return null;
    const doc = docForOnboardingKey(key);
    if (!doc) return null;
    if (doc.type === "template") return { label: "Open template", href: `/app/documents/template/${doc.key}` };
    if (doc.type === "generate") return { label: "Generate", href: `/app/management/documents/${t.id}` };
    if (doc.type === "link" && doc.linkKey && juris) {
      const l = (juris as unknown as Record<string, { url: string }>)[doc.linkKey];
      if (l) return { label: "Open", href: l.url, external: true };
    }
    return null;
  }

  function toggleItem(key: string) {
    const next = items.map((i) =>
      i.key === key ? { ...i, done: !i.done, done_date: !i.done ? todayIso() : null } : i
    );
    setOnboarding(t.id, next);
  }

  function setInspectionStatus(insp: Inspection, status: Inspection["status"]) {
    saveInspection(
      {
        property_id: insp.property_id,
        tenancy_id: insp.tenancy_id,
        kind: insp.kind,
        scheduled_date: insp.scheduled_date,
        scheduled_time: insp.scheduled_time,
        notice_sent_date: insp.notice_sent_date,
        status,
        notes: insp.notes,
      },
      insp.id
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-background">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left"
      >
        <div>
          <div className="text-lg font-semibold tracking-tight">{t.tenant_name || "(unnamed tenant)"}</div>
          <div className="mt-0.5 text-sm text-muted">
            {property?.address || "No property linked"}
            {t.move_in_date ? ` · moves in ${fmtDate(t.move_in_date)}` : ""}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone[t.status]}>{t.status[0].toUpperCase() + t.status.slice(1)}</Badge>
          <Badge tone={pct === 100 ? "good" : "warn"}>Onboarding {pct}%</Badge>
          {t.bond_lodged ? <Badge tone="good">Bond lodged</Badge> : <Badge tone="warn">Bond not lodged</Badge>}
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Info label="Email" value={t.tenant_email || "—"} />
            <Info label="Phone" value={t.tenant_phone || "—"} />
            <Info label="Weekly rent" value={fmtMoney(t.weekly_rent)} />
            <Info label="Lease" value={`${fmtDate(t.lease_start)} → ${fmtDate(t.lease_end)}`} />
            <Info
              label="Bond"
              value={
                fmtMoney(t.bond_amount) +
                (cap != null && t.bond_amount != null && t.bond_amount > cap ? " (over cap)" : "")
              }
            />
            <Info label="Bond reference" value={t.bond_reference || "—"} />
            <Info label="Emergency contact" value={t.emergency_contact || "—"} />
            <Info label="Move-in" value={fmtDate(t.move_in_date)} />
          </div>
          {t.notes && <p className="mt-4 text-sm text-muted">{t.notes}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button onClick={() => onEdit(t)} className="text-sm font-medium text-accent hover:underline">
              Edit tenancy details
            </button>
            {t.status === "ended" ? (
              <span className="text-sm text-muted">Ended{t.ended_at ? ` · ${fmtDate(t.ended_at.slice(0, 10))}` : ""}</span>
            ) : (
              <>
                {otherProperties.length > 0 && (
                  <button
                    onClick={() => {
                      setTransferOpen((o) => !o);
                      setTransferErr("");
                    }}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Transfer to another property
                  </button>
                )}
                <button onClick={handleEnd} disabled={ending} className="text-sm font-medium text-bad hover:underline disabled:opacity-50">
                  {ending ? "Ending…" : "End tenancy"}
                </button>
              </>
            )}
          </div>

          {transferOpen && t.status !== "ended" && (
            <div className="mt-3 rounded-xl border border-border bg-surface p-4">
              <h4 className="text-sm font-semibold">Transfer this tenant to another property</h4>
              <p className="mt-1 text-xs text-muted">
                Moves {t.tenant_name || "the tenant"} and everyone on the lease (plus their documents) into a
                new tenancy — no new application. This property gets a past-tenancy record and their portal
                switches to the new one.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">New property</span>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
                  >
                    <option value="">Select a property…</option>
                    {otherProperties.map((p) => (
                      <option key={p.id} value={p.id}>{p.address || "(unnamed property)"}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Move-in / new lease start</span>
                  <input
                    type="date"
                    value={transferMoveIn}
                    onChange={(e) => setTransferMoveIn(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Weekly rent (optional)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={transferRent}
                    onChange={(e) => setTransferRent(e.target.value)}
                    placeholder={t.weekly_rent != null ? `Carry over ${fmtMoney(t.weekly_rent)}` : "Same as before"}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Reference note for the ended lease (optional)</span>
                  <input
                    type="text"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    placeholder="e.g. always paid on time, property left in good order"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
                  />
                </label>
              </div>
              {transferErr && <p className="mt-2 text-sm text-bad">{transferErr}</p>}
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={handleTransfer}
                  disabled={transferring}
                  className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  {transferring ? "Transferring…" : "Transfer tenant"}
                </button>
                <button
                  onClick={() => setTransferOpen(false)}
                  disabled={transferring}
                  className="text-sm text-muted hover:text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Move-in checklist */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">Move-in checklist</h4>
              <span className="text-xs text-muted">{doneCount}/{items.length} done</span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-good transition-all" style={{ width: `${pct}%` }} />
            </div>
            <ul className="space-y-1">
              {items.map((i) => {
                const action = docActionFor(i.key);
                return (
                  <li key={i.key} className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-surface">
                    <label className="flex flex-1 cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={i.done} onChange={() => toggleItem(i.key)} className="mt-1" />
                      <span className={`text-sm ${i.done ? "text-muted line-through" : ""}`}>
                        {i.label}
                        {i.done && i.done_date ? (
                          <span className="ml-2 text-xs text-muted">· {fmtDate(i.done_date)}</span>
                        ) : null}
                      </span>
                    </label>
                    {action &&
                      (action.external ? (
                        <a href={action.href} target="_blank" rel="noopener noreferrer" className="mt-0.5 shrink-0 text-xs font-medium text-accent hover:underline">
                          {action.label} ↗
                        </a>
                      ) : (
                        <Link href={action.href} className="mt-0.5 shrink-0 text-xs font-medium text-accent hover:underline">
                          {action.label} →
                        </Link>
                      ))}
                  </li>
                );
              })}
            </ul>
            {!docsUnlocked && (
              <p className="mt-2 text-xs text-muted">
                <Link href="/app/billing" className="text-accent hover:underline">Upgrade to Plus</Link> to get the
                right form/link beside each step.
              </p>
            )}
          </div>

          {/* Tenant application / onboarding link */}
          <ApplicationPanel tenancy={t} />

          {/* Tenant portal */}
          <PortalPanel tenancy={t} />

          {/* Inspections */}
          <div className="mt-6">
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Inspections</h4>
            {myInspections.length === 0 ? (
              <p className="mb-3 text-sm text-muted">None scheduled yet.</p>
            ) : (
              <ul className="mb-3 space-y-2">
                {myInspections.map((insp) => (
                  <li
                    key={insp.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium capitalize">{insp.kind}</span>
                      {" · "}
                      {fmtDate(insp.scheduled_date)}
                      {insp.scheduled_time ? ` at ${insp.scheduled_time}` : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge
                        tone={insp.status === "completed" ? "good" : insp.status === "cancelled" ? "neutral" : "warn"}
                      >
                        {insp.status[0].toUpperCase() + insp.status.slice(1)}
                      </Badge>
                      {insp.status === "scheduled" && (
                        <>
                          <button onClick={() => setInspectionStatus(insp, "completed")} className="text-xs font-medium text-accent hover:underline">
                            Done
                          </button>
                          <button onClick={() => setInspectionStatus(insp, "cancelled")} className="text-xs font-medium text-muted hover:underline">
                            Cancel
                          </button>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {t.property_id && <InspectionScheduler propertyId={t.property_id} tenancyId={t.id} />}
          </div>

          {/* Condition reports — issue to the tenant to counter-sign in their portal */}
          <div className="mt-6">
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Condition reports</h4>
            {myReports.length === 0 ? (
              <p className="mb-3 text-sm text-muted">None issued yet.</p>
            ) : (
              <ul className="mb-3 space-y-2">
                {myReports.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <span>
                      <span className="font-medium capitalize">{r.kind}</span>
                      {" · issued "}
                      {fmtDate(r.issued_at.slice(0, 10))}
                      {r.notes ? <span className="block text-xs text-muted">{r.notes}</span> : null}
                      {r.acknowledged_at && r.tenant_comment ? (
                        <span className="block text-xs text-muted">Tenant note: {r.tenant_comment}</span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      {r.acknowledged_at ? (
                        <Badge tone="good">Acknowledged{r.acknowledged_name ? ` · ${r.acknowledged_name}` : ""}</Badge>
                      ) : (
                        <Badge tone="warn">Awaiting tenant</Badge>
                      )}
                      <button onClick={() => deleteConditionReport(r.id)} className="text-xs text-muted hover:text-bad">
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={crKind}
                  onChange={(e) => setCrKind(e.target.value as "ingoing" | "outgoing")}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
                >
                  <option value="ingoing">Ingoing</option>
                  <option value="outgoing">Outgoing</option>
                </select>
                <input
                  type="text"
                  value={crNotes}
                  onChange={(e) => setCrNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="min-w-[180px] flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
                />
                <label className="text-xs text-muted">
                  <span className="mr-2">Attach report (optional)</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setCrFile(e.target.files?.[0] ?? null)}
                    className="text-xs file:mr-2 file:rounded-full file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium"
                  />
                </label>
                <button
                  onClick={issueReport}
                  disabled={crBusy}
                  className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
                >
                  {crBusy ? "Issuing…" : "Issue report"}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">
                The tenant sees this in their portal and can acknowledge (counter-sign) it — the record a bond
                claim rests on.
              </p>
              {crErr && <p className="mt-2 text-sm text-bad">{crErr}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
