"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { Field } from "./Field";
import { usePortfolio } from "@/lib/portfolio";
import type { Property } from "@/lib/types";
import {
  daysUntil,
  equity,
  fmtDate,
  fmtMoney,
  fmtPct,
  grossYield,
  lvr,
} from "@/lib/format";

function LeaseBadge({ p }: { p: Property }) {
  if (!p.lease_end) return <Badge tone="neutral">No lease on file</Badge>;
  const d = daysUntil(p.lease_end);
  if (d === null) return <Badge tone="neutral">No lease on file</Badge>;
  if (d < 0) return <Badge tone="bad">Lease ended</Badge>;
  if (d <= 30) return <Badge tone="warn">Lease ends in {d}d</Badge>;
  return <Badge tone="good">Lease to {fmtDate(p.lease_end)}</Badge>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 text-sm tabular">{value}</div>
    </div>
  );
}

export default function PropertyCard({
  property,
  onEdit,
}: {
  property: Property;
  onEdit: (p: Property) => void;
}) {
  const { paymentsByProperty, addPayment } = usePortfolio();
  const [open, setOpen] = useState(false);
  const [due, setDue] = useState("");
  const [amount, setAmount] = useState(property.weekly_rent != null ? String(property.weekly_rent) : "");
  const [received, setReceived] = useState("");
  const [status, setStatus] = useState("");

  const p = property;
  const l = lvr(p);
  const y = grossYield(p);
  const payments = (paymentsByProperty[p.id] || [])
    .slice()
    .sort((a, b) => (b.due_date || "").localeCompare(a.due_date || ""));

  async function logPayment() {
    if (!due || !amount) {
      setStatus("Due date and amount are required.");
      return;
    }
    setStatus("Saving…");
    const res = await addPayment(p.id, {
      due_date: due,
      amount: Number(amount),
      received_date: received || null,
    });
    if (res.error) {
      setStatus("Couldn't save: " + res.error);
      return;
    }
    setStatus("Saved.");
    setDue("");
    setReceived("");
  }

  return (
    <div className="rounded-2xl border border-border bg-background">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left"
      >
        <div>
          <div className="text-lg font-semibold tracking-tight">{p.address || "(no address)"}</div>
          <div className="mt-0.5 text-sm text-muted">
            {fmtMoney(p.weekly_rent)}/week
            {p.rent_due_day ? ` · due ${p.rent_due_day}` : ""}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {l !== null && <Badge tone={l > 0.8 ? "bad" : "good"}>LVR {fmtPct(l)}</Badge>}
          <LeaseBadge p={p} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Info label="Current value" value={fmtMoney(p.current_value)} />
            <Info label="Loan balance" value={fmtMoney(p.loan_balance)} />
            <Info label="Equity" value={fmtMoney(equity(p))} />
            <Info label="Gross yield" value={fmtPct(y)} />
            <Info label="Purchase price" value={fmtMoney(p.purchase_price)} />
            <Info label="Bond" value={fmtMoney(p.bond)} />
            <Info label="Lender" value={p.lender || "—"} />
            <Info label="Lease" value={`${fmtDate(p.lease_start)} → ${fmtDate(p.lease_end)}`} />
          </div>

          <button
            onClick={() => onEdit(p)}
            className="mt-4 text-sm font-medium text-accent hover:underline"
          >
            Edit property details
          </button>

          <h4 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-muted">
            Rent ledger
          </h4>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-semibold">Due</th>
                  <th className="px-3 py-2 font-semibold">Amount</th>
                  <th className="px-3 py-2 font-semibold">Received</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-muted">
                      No payments logged yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((pay) => (
                    <tr key={pay.id} className="border-t border-border tabular">
                      <td className="px-3 py-2">{fmtDate(pay.due_date)}</td>
                      <td className="px-3 py-2">{fmtMoney(pay.amount)}</td>
                      <td className="px-3 py-2">{pay.received_date ? fmtDate(pay.received_date) : "—"}</td>
                      <td className="px-3 py-2">
                        <Badge
                          tone={pay.status === "paid" ? "good" : pay.status === "late" ? "bad" : "warn"}
                        >
                          {pay.status[0].toUpperCase() + pay.status.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Due date" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="min-w-[140px] flex-1" />
            <Field label="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="min-w-[120px] flex-1" />
            <Field label="Received date" type="date" value={received} onChange={(e) => setReceived(e.target.value)} className="min-w-[140px] flex-1" />
            <button
              onClick={logPayment}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
            >
              Log payment
            </button>
          </div>
          {status && <p className="mt-2 text-sm text-muted">{status}</p>}
        </div>
      )}
    </div>
  );
}
