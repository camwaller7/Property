"use client";

import Link from "next/link";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import { usePortfolio } from "@/lib/portfolio";
import { brand } from "@/lib/brand";
import { daysUntil, fmtDate, fmtMoney, fmtPct } from "@/lib/format";

export default function DashboardPage() {
  const { properties, paymentsByProperty, tenancies, inspections, maintenance, stats, loading, error } =
    usePortfolio();

  const leaseAlerts = properties
    .map((p) => ({ p, d: daysUntil(p.lease_end) }))
    .filter((x) => x.d !== null && x.d <= 30)
    .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));

  const arrears = properties.filter((p) =>
    (paymentsByProperty[p.id] || []).some((pay) => pay.status === "late")
  );

  const openMatters = maintenance.filter((m) => m.status !== "resolved" && m.status !== "cancelled");
  const urgentMatters = openMatters.filter((m) => m.urgency === "urgent");
  const upcomingInspections = inspections
    .filter((i) => i.status === "scheduled")
    .map((i) => ({ i, d: daysUntil(i.scheduled_date) }))
    .filter((x) => x.d !== null && x.d >= 0 && x.d <= 14)
    .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));

  const nothingToDo =
    openMatters.length === 0 && stats.lateCount === 0 && leaseAlerts.length === 0 && upcomingInspections.length === 0;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted">What needs attention, and your portfolio at a glance.</p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-bad/40 bg-bad-surface px-4 py-3 text-sm text-bad">
          Couldn&apos;t load your portfolio: {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : stats.count === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted">Welcome to {brand.name}. Add your first property to get started.</p>
          <Link
            href="/app/properties"
            className="mt-4 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-80"
          >
            Add your first property
          </Link>
        </div>
      ) : (
        <>
          {/* Needs attention */}
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Needs attention</h2>
            {nothingToDo ? (
              <div className="rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-muted">
                You&apos;re all caught up — no open matters, arrears, expiring leases or inspections due.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <ActionTile
                  label="Open matters"
                  count={openMatters.length}
                  hint={urgentMatters.length > 0 ? `${urgentMatters.length} urgent` : "requests & messages"}
                  tone={urgentMatters.length > 0 ? "bad" : openMatters.length > 0 ? "warn" : "good"}
                  href="/app/management"
                />
                <ActionTile
                  label="Rent overdue"
                  count={stats.lateCount}
                  hint="late payments"
                  tone={stats.lateCount > 0 ? "bad" : "good"}
                  href="/app/properties"
                />
                <ActionTile
                  label="Leases expiring"
                  count={leaseAlerts.length}
                  hint="within 30 days"
                  tone={leaseAlerts.length > 0 ? "warn" : "good"}
                  href="/app/management"
                />
                <ActionTile
                  label="Inspections due"
                  count={upcomingInspections.length}
                  hint="within 14 days"
                  tone={upcomingInspections.length > 0 ? "warn" : "good"}
                  href="/app/management"
                />
              </div>
            )}
          </section>

          {/* Open matters list */}
          {openMatters.length > 0 && (
            <section className="mb-8 rounded-2xl border border-border p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Open matters</h2>
                <Link href="/app/management" className="text-sm font-medium text-accent hover:underline">
                  Manage all
                </Link>
              </div>
              <ul className="space-y-2">
                {openMatters.slice(0, 6).map((m) => {
                  const prop = properties.find((p) => p.id === m.property_id);
                  return (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>
                        {m.title}
                        <span className="text-xs capitalize text-muted"> · {m.kind} · {prop?.address || "—"}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {m.urgency === "urgent" && <Badge tone="bad">Urgent</Badge>}
                        <Badge tone={m.status === "open" ? "warn" : "neutral"}>{m.status.replace("_", " ")}</Badge>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Portfolio KPIs */}
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Portfolio</h2>
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
                <Badge tone={leaseAlerts.length > 0 ? "warn" : "good"}>{leaseAlerts.length} within 30 days</Badge>
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

          {/* Upcoming inspections */}
          {upcomingInspections.length > 0 && (
            <section className="mt-6 rounded-2xl border border-border p-5">
              <h2 className="mb-3 text-lg font-semibold tracking-tight">Upcoming inspections</h2>
              <ul className="space-y-2">
                {upcomingInspections.map(({ i, d }) => {
                  const prop = properties.find((p) => p.id === i.property_id);
                  const ten = tenancies.find((t) => t.id === i.tenancy_id);
                  return (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>
                        <span className="capitalize">{i.kind}</span> · {prop?.address || "—"}
                        {ten?.tenant_name ? ` · ${ten.tenant_name}` : ""}
                      </span>
                      <span className="text-muted">
                        {fmtDate(i.scheduled_date)} <Badge tone={d! <= 7 ? "warn" : "neutral"}>{d}d</Badge>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ActionTile({
  label,
  count,
  hint,
  tone,
  href,
}: {
  label: string;
  count: number;
  hint: string;
  tone: "good" | "bad" | "warn";
  href: string;
}) {
  const valueTone = tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-good";
  return (
    <Link href={href} className="rounded-2xl border border-border bg-background p-5 transition-colors hover:bg-surface">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular ${count > 0 ? valueTone : "text-foreground"}`}>{count}</div>
      <div className="mt-1 text-xs text-muted">{hint}</div>
    </Link>
  );
}
