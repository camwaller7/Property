"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { Field, Select } from "./Field";
import { usePortfolio } from "@/lib/portfolio";
import { fmtDate, fmtMoney } from "@/lib/format";
import { BILL_KINDS, BILL_KIND_LABEL, BILL_FREQUENCIES } from "@/lib/bills";
import type { BillKind, BillFrequency } from "@/lib/types";

// Recurring outgoings per property (council rates, water, insurance…). Landlord
// sets each one's amount, cycle, next due date and who pays. They project into
// the Management calendar + dashboard. Water (payer = tenant) can be sent to the
// tenant as a portal notice to recover.
export default function PropertyBills() {
  const { properties, propertyBills, tenancies, addPropertyBill, deletePropertyBill, addNotice } = usePortfolio();

  const [propertyId, setPropertyId] = useState("");
  const [kind, setKind] = useState<BillKind>("council_rates");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<BillFrequency>("quarterly");
  const [nextDue, setNextDue] = useState("");
  const [payer, setPayer] = useState<"landlord" | "tenant">("landlord");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // Council rates are landlord-paid; water is usually recovered from the tenant.
  function pickKind(k: BillKind) {
    setKind(k);
    setPayer(k === "water" ? "tenant" : "landlord");
  }

  async function add() {
    if (!propertyId) return setErr("Choose a property.");
    if (!nextDue) return setErr("Set the next due date.");
    setBusy(true);
    setErr("");
    setMsg("");
    const res = await addPropertyBill({
      property_id: propertyId,
      kind,
      label: label.trim() || null,
      amount: amount === "" ? null : Number(amount),
      frequency,
      next_due: nextDue,
      payer,
      notes: null,
      active: true,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setLabel("");
    setAmount("");
    setNextDue("");
    setMsg("Bill added ✓");
  }

  async function sendToTenant(billId: string) {
    const bill = propertyBills.find((b) => b.id === billId);
    if (!bill) return;
    const ten = tenancies.find((t) => t.property_id === bill.property_id && t.status !== "ended");
    if (!ten) return setErr("No active tenancy on that property to send to.");
    const name = bill.label || BILL_KIND_LABEL[bill.kind] || "Bill";
    setErr("");
    const res = await addNotice({
      property_id: bill.property_id,
      tenancy_id: ten.id,
      category: "bill",
      title: `${name}${bill.amount != null ? ` — ${fmtMoney(bill.amount)}` : ""}`,
      body: `Your share of the ${name.toLowerCase()} is due${bill.next_due ? ` by ${fmtDate(bill.next_due)}` : ""}. Please arrange payment with your property manager.`,
      due_date: bill.next_due,
    });
    setMsg(res.error ? "" : "Sent to tenant portal ✓");
    if (res.error) setErr(res.error);
  }

  const propLabel = (id: string | null) => properties.find((p) => p.id === id)?.address || "—";
  const rows = propertyId
    ? propertyBills.filter((b) => b.property_id === propertyId)
    : propertyBills;

  return (
    <section className="mb-8 rounded-2xl border border-border p-5">
      <h2 className="mb-1 text-lg font-semibold tracking-tight">Recurring bills &amp; rates</h2>
      <p className="mb-4 text-sm text-muted">
        Council rates, water and other recurring outgoings. These appear in your Management calendar and
        dashboard. Water and other tenant-recoverable bills can be sent to the tenant portal.
      </p>

      <div className="rounded-xl border border-border p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Property" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Select a property…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.address || "(no address)"}</option>
            ))}
          </Select>
          <Select label="Type" value={kind} onChange={(e) => pickKind(e.target.value as BillKind)}>
            {BILL_KINDS.map((k) => (
              <option key={k} value={k}>{BILL_KIND_LABEL[k]}</option>
            ))}
          </Select>
          <Field label="Amount ($)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as BillFrequency)}>
            {BILL_FREQUENCIES.map((f) => (
              <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>
            ))}
          </Select>
          <Field label="Next due" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
          <Select label="Paid by" value={payer} onChange={(e) => setPayer(e.target.value as "landlord" | "tenant")}>
            <option value="landlord">Landlord</option>
            <option value="tenant">Tenant (recoverable)</option>
          </Select>
          <Field label="Label (optional)" className="sm:col-span-2" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. SA Water Q3" />
        </div>
        <button
          onClick={add}
          disabled={busy}
          className="mt-3 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add bill"}
        </button>
        {msg && <p className="mt-2 text-sm text-good">{msg}</p>}
        {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      </div>

      {rows.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rows.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Badge tone={b.payer === "tenant" ? "warn" : "neutral"}>{b.payer === "tenant" ? "Tenant" : "Landlord"}</Badge>
                <span className="font-medium">{b.label || BILL_KIND_LABEL[b.kind] || "Bill"}</span>
                {b.amount != null && <span>· {fmtMoney(b.amount)}</span>}
                <span className="text-xs text-muted">· {b.frequency} · next {fmtDate(b.next_due)}</span>
                {!propertyId && <span className="text-xs text-muted">· {propLabel(b.property_id)}</span>}
              </span>
              <span className="flex items-center gap-3">
                {b.payer === "tenant" && (
                  <button onClick={() => sendToTenant(b.id)} className="text-xs font-medium text-accent hover:underline">
                    Send to tenant
                  </button>
                )}
                <button onClick={() => deletePropertyBill(b.id)} className="text-xs text-muted hover:text-bad">
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
