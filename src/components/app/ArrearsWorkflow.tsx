"use client";

import { useMemo, useState } from "react";
import type { Payment, Tenancy, Property } from "@/lib/types";
import { usePortfolio } from "@/lib/portfolio";
import { brand } from "@/lib/brand";
import { fmtDate, toISODate } from "@/lib/format";
import { postEmail } from "@/lib/email";
import { jurisdiction } from "@/lib/jurisdictions";
import {
  arrearsStatus,
  ARREARS_STAGES,
  arrearsLetter,
  nextArrearsStage,
  stageLabel,
  type ArrearsStage,
} from "@/lib/arrears";

function money(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Manager-internal rent-arrears workflow for one tenancy: shows the arrears
// position, an escalation ladder with each recorded step, and a draft-letter
// panel (copy / email the tenant). Rendered on the rent-ledger page but
// print:hidden — it never appears on the tenant-facing printed statement.
export default function ArrearsWorkflow({
  property,
  tenancy,
  payments,
}: {
  property: Property;
  tenancy: Tenancy | null;
  payments: Payment[];
}) {
  const { arrearsNotices, addArrearsNotice } = usePortfolio();
  const status = useMemo(() => arrearsStatus(payments), [payments]);
  const notices = useMemo(
    () =>
      arrearsNotices
        .filter((n) => tenancy && n.tenancy_id === tenancy.id)
        .sort((a, b) => (a.sent_on < b.sent_on ? 1 : a.sent_on > b.sent_on ? -1 : 0)),
    [arrearsNotices, tenancy]
  );

  const lastByStage = useMemo(() => {
    const m = new Map<string, string>(); // stage -> most recent sent_on
    for (const n of notices) if (!m.has(n.stage)) m.set(n.stage, n.sent_on);
    return m;
  }, [notices]);

  const doneStages = Array.from(lastByStage.keys()) as ArrearsStage[];
  const suggested = nextArrearsStage(doneStages);
  const juris = jurisdiction(property.state);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [draftStage, setDraftStage] = useState<ArrearsStage | null>(null);
  const [draft, setDraft] = useState("");

  if (!status.isInArrears) {
    return (
      <section className="mt-6 rounded-xl border border-border p-4 print:hidden">
        <h2 className="text-sm font-semibold">Arrears workflow</h2>
        <p className="mt-1 text-sm text-good">No rent is in arrears for this tenancy.</p>
      </section>
    );
  }

  function buildDraft(stage: ArrearsStage): string {
    return arrearsLetter({
      stage,
      tenantName: tenancy?.tenant_name,
      propertyAddress: property.address,
      landlordName: property.landlord_name,
      amount: status.amount,
      daysInArrears: status.daysInArrears,
      asOf: toISODate(new Date()),
      authorityName: juris?.authority.name ?? null,
      tribunalName: juris?.tribunal.name ?? null,
      brandName: brand.full,
    });
  }

  function openDraft(stage: ArrearsStage) {
    setErr("");
    setMsg("");
    setDraftStage(stage);
    setDraft(buildDraft(stage));
  }

  async function record(stage: ArrearsStage) {
    if (!tenancy) return;
    setBusy(true);
    setErr("");
    setMsg("");
    const res = await addArrearsNotice({
      tenancyId: tenancy.id,
      propertyId: property.id,
      stage,
      amount: status.amount,
      daysInArrears: status.daysInArrears,
      note: null,
    });
    setBusy(false);
    if (res.error) setErr(res.error);
    else setMsg(`Recorded: ${stageLabel(stage)} (${fmtDate(toISODate(new Date()))})`);
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setMsg("Draft copied to clipboard.");
    } catch {
      setErr("Couldn't copy — select the text and copy manually.");
    }
  }

  async function emailTenant() {
    if (!tenancy?.tenant_email || !draftStage) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await postEmail({
        to: tenancy.tenant_email,
        subject: `Rent overdue${property.address ? ` — ${property.address}` : ""}`,
        body: draft,
        tenancyId: tenancy.id,
      });
      if (!res.ok) {
        setErr("Couldn't send the email. Check email is configured.");
      } else {
        // Log the step as sent, so the ladder reflects it.
        await record(draftStage);
        setMsg(`Emailed to ${tenancy.tenant_email} and recorded.`);
        setDraftStage(null);
        setDraft("");
      }
    } catch {
      setErr("Couldn't send the email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-border p-4 print:hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Arrears workflow</h2>
        <span className="text-sm text-bad">
          {money(status.amount)} overdue · {status.daysInArrears} day{status.daysInArrears === 1 ? "" : "s"} in
          arrears · {status.overdueCount} instalment{status.overdueCount === 1 ? "" : "s"}
        </span>
      </div>

      <p className="mt-1 text-xs text-muted">
        A guided escalation trail for this tenancy — record each step as you take it. The draft letters are a
        communication about the account, not statutory notices;{" "}
        {juris ? (
          <>
            confirm the required notice periods and forms with{" "}
            <a href={juris.authority.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {juris.authority.name}
            </a>
            .
          </>
        ) : (
          <>confirm the required notice periods and forms with your state tenancy authority.</>
        )}
      </p>

      {/* Stage ladder */}
      <ol className="mt-4 space-y-2">
        {ARREARS_STAGES.map((s) => {
          const done = lastByStage.get(s.stage);
          const isNext = suggested === s.stage;
          return (
            <li
              key={s.stage}
              className={
                "rounded-lg border p-3 " +
                (done ? "border-border bg-surface" : isNext ? "border-accent" : "border-border")
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-medium">
                    {done ? "✓ " : isNext ? "→ " : ""}
                    {s.label}
                  </span>
                  {done ? (
                    <span className="ml-2 text-xs text-muted">recorded {fmtDate(done)}</span>
                  ) : (
                    <span className="ml-2 text-xs text-muted">{s.blurb}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openDraft(s.stage)}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface"
                  >
                    Draft letter
                  </button>
                  <button
                    onClick={() => record(s.stage)}
                    disabled={busy}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface disabled:opacity-50"
                  >
                    {done ? "Record again" : "Record step"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Draft panel */}
      {draftStage && (
        <div className="mt-4 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Draft — {stageLabel(draftStage)}</h3>
            <button
              onClick={() => {
                setDraftStage(null);
                setDraft("");
              }}
              className="text-xs text-muted hover:underline"
            >
              Close
            </button>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={copyDraft}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface"
            >
              Copy
            </button>
            <button
              onClick={emailTenant}
              disabled={busy || !tenancy?.tenant_email}
              title={tenancy?.tenant_email ? `Email ${tenancy.tenant_email}` : "No tenant email on file"}
              className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background hover:opacity-80 disabled:opacity-50"
            >
              {tenancy?.tenant_email ? "Email tenant + record" : "No tenant email"}
            </button>
          </div>
        </div>
      )}

      {/* Recorded history */}
      {notices.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">History</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {notices.map((n) => (
              <li key={n.id} className="flex justify-between border-t border-border py-1">
                <span>{stageLabel(n.stage as ArrearsStage)}</span>
                <span className="text-muted">
                  {fmtDate(n.sent_on)}
                  {n.amount != null ? ` · ${money(n.amount)}` : ""}
                  {n.days_in_arrears != null ? ` · ${n.days_in_arrears}d` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-good">{msg}</p>}
      {err && <p className="mt-3 text-sm text-bad">{err}</p>}
    </section>
  );
}
