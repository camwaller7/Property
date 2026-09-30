"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { usePortfolio } from "@/lib/portfolio";
import { brand } from "@/lib/brand";
import { fmtDate, toISODate } from "@/lib/format";
import { ledgerRows, ledgerSummary, ledgerCsv } from "@/lib/rentLedger";

// A rent ledger is a financial record, so money is shown to the cent here
// (the app-wide `fmtMoney` rounds to whole dollars, which would drop cents and
// let the displayed rows disagree with the displayed total).
function fmtLedgerMoney(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Printable rent ledger for one property: running balance, arrears summary and
// a CSV export. A rent ledger is providable-on-request under most AU tenancy
// laws, so this is the manager's record + the tenant-facing statement.
export default function RentLedgerPage() {
  const params = useParams<{ id: string }>();
  const propertyId = params.id;
  const { loading, properties, paymentsByProperty, tenancies } = usePortfolio();

  const property = properties.find((p) => p.id === propertyId) ?? null;
  const payments = useMemo(() => paymentsByProperty[propertyId] || [], [paymentsByProperty, propertyId]);
  const rows = useMemo(() => ledgerRows(payments), [payments]);
  const summary = useMemo(() => ledgerSummary(payments), [payments]);

  // Active tenancy (if any) for the statement header.
  const tenancy =
    tenancies.find((t) => t.property_id === propertyId && t.status === "active") ??
    tenancies.find((t) => t.property_id === propertyId) ??
    null;

  function exportCsv() {
    const matrix = ledgerCsv(rows, summary);
    const csv = matrix.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rent-ledger-${(property?.address || "property").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!property) {
    return (
      <div>
        <p className="text-muted">Property not found.</p>
        <Link href="/app/properties" className="mt-2 inline-block text-sm text-accent hover:underline">
          ← Back to properties
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Toolbar — hidden in print */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/app/properties" className="text-sm text-accent hover:underline">
          ← Back to properties
        </Link>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-surface"
          >
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-80"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Statement header */}
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{brand.full} — Rent ledger</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{property.address || "Property"}</h1>
        <p className="mt-1 text-sm text-muted">
          {tenancy?.tenant_name ? <>Tenant: {tenancy.tenant_name} · </> : null}
          Generated {fmtDate(toISODate(new Date()))}
        </p>
      </header>

      {/* Summary tiles. "In arrears" is the headline (rent overdue and unpaid);
          "Scheduled outstanding" is all unpaid rent including instalments not yet
          due, so a paid-up tenant with future rent already scheduled is never
          shown as in debt. */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="In arrears" value={fmtLedgerMoney(summary.arrears)} tone={summary.arrears > 0 ? "bad" : "good"} />
        <Tile label="Total received" value={fmtLedgerMoney(summary.totalReceived)} />
        <Tile label="Scheduled outstanding" value={fmtLedgerMoney(summary.balance)} />
        <Tile label="Next due" value={summary.nextDueDate ? fmtDate(summary.nextDueDate) : "—"} />
      </div>

      {/* Ledger table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-semibold">Due date</th>
              <th className="px-3 py-2 font-semibold">Charged</th>
              <th className="px-3 py-2 font-semibold">Received</th>
              <th className="px-3 py-2 font-semibold">Paid</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-muted">
                  No rent instalments recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border tabular">
                  <td className="px-3 py-2">{fmtDate(r.due_date)}</td>
                  <td className="px-3 py-2">{fmtLedgerMoney(r.amount)}</td>
                  <td className="px-3 py-2">{r.received_date ? fmtDate(r.received_date) : "—"}</td>
                  <td className="px-3 py-2">{r.paid ? fmtLedgerMoney(r.paid) : "—"}</td>
                  <td className="px-3 py-2">
                    <Badge tone={r.status === "paid" ? "good" : r.status === "late" ? "bad" : "warn"}>
                      {r.status[0].toUpperCase() + r.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">{fmtLedgerMoney(r.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border font-semibold tabular">
                <td className="px-3 py-2">Totals</td>
                <td className="px-3 py-2">{fmtLedgerMoney(summary.totalCharged)}</td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2">{fmtLedgerMoney(summary.totalReceived)}</td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-right">{fmtLedgerMoney(summary.balance)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">
        Each row is one scheduled rent instalment. Balance is the running total of rent charged less
        rent received. Not a tax document.
      </p>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div
        className={
          "mt-1 text-lg font-semibold tabular " +
          (tone === "bad" ? "text-bad" : tone === "good" ? "text-good" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}
