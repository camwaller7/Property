"use client";

import Link from "next/link";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import { usePortfolio } from "@/lib/portfolio";
import { daysUntil, fmtDate, fmtMoney, fmtPct } from "@/lib/format";

export default function DashboardPage() {
  const { properties, paymentsByProperty, stats, loading, error } = usePortfolio();

  const leaseAlerts = properties
    .map((p) => ({ p, d: daysUntil(p.lease_end) }))
    .filter((x) => x.d !== null && x.d <= 30)
    .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));

  const arrears = properties.filter((p) =>
    (paymentsByProperty[p.id] || []).some((pay) => pay.status === "late")
  );

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Portfolio</h1>
        <p className="mt-1 text-muted">Your position across every property, at a glance.</p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-bad/40 bg-bad-surface px-4 py-3 text-sm text-bad">
          Couldn&apos;t load your portfolio: {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Properties" value={stats.count} />
            <StatCard label="Weekly rent" value={fmtMoney(stats.totalWeeklyRent)} hint="Gross, across portfolio" />
            <StatCard label="Portfolio value" value={fmtMoney(stats.totalValue)} />
            <StatCard label="Total debt" value={fmtMoney(stats.totalDebt)} />
            <StatCard label="Equity" value={fmtMoney(stats.totalEquity)} tone="good" />
            <StatCard
              label="Portfolio LVR"
              value={stats.lvr === null ? "—" : fmtPct(stats.lvr)}
              tone={stats.lvr !== null && stats.lvr > 0.8 ? "bad" : "good"}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-border p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Arrears</h2>
                <Badge tone={stats.lateCount > 0 ? "bad" : "good"}>
                  {stats.lateCount} late {stats.lateCount === 1 ? "payment" : "payments"}
                </Badge>
              </div>
              {arrears.length === 0 ? (
                <p className="text-sm text-muted">No properties in arrears. Rent&apos;s on track.</p>
              ) : (
                <ul className="space-y-2">
                  {arrears.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span>{p.address}</span>
                      <Link href="/app/properties" className="font-medium text-accent hover:underline">
                        View ledger
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-border p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Lease expiries</h2>
                <Badge tone={leaseAlerts.length > 0 ? "warn" : "good"}>
                  {leaseAlerts.length} within 30 days
                </Badge>
              </div>
              {leaseAlerts.length === 0 ? (
                <p className="text-sm text-muted">No leases expiring in the next 30 days.</p>
              ) : (
                <ul className="space-y-2">
                  {leaseAlerts.map(({ p, d }) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span>{p.address}</span>
                      <span className="text-muted">
                        {d! < 0 ? "Ended" : `${d}d`} · {fmtDate(p.lease_end)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {stats.count === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-muted">No properties yet.</p>
              <Link
                href="/app/properties"
                className="mt-4 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-80"
              >
                Add your first property
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
