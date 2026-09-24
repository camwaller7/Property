"use client";

import { useMemo } from "react";
import Badge from "@/components/ui/Badge";
import PropertyCalendar from "./PropertyCalendar";
import MaintenanceManager from "./MaintenanceManager";
import { usePortfolio } from "@/lib/portfolio";
import { daysUntil, fmtDate, fmtMoney } from "@/lib/format";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// The Management dashboard: the event calendar up top, then at-a-glance tiles
// summarising what needs attention across the whole portfolio.
export default function ManagementDashboard() {
  const { properties, tenancies, inspections, maintenance, paymentsByProperty } = usePortfolio();

  const propLabel = (id: string | null) => properties.find((p) => p.id === id)?.address || "—";

  const data = useMemo(() => {
    const today = todayIso();

    // Overdue rent across the portfolio.
    const overdueRent: { propertyId: string; amount: number | null; due: string | null }[] = [];
    for (const [propertyId, list] of Object.entries(paymentsByProperty)) {
      for (const p of list) {
        if (p.status !== "paid" && !p.received_date && p.due_date && p.due_date < today) {
          overdueRent.push({ propertyId, amount: p.amount, due: p.due_date });
        }
      }
    }

    const openMaintenance = maintenance.filter((m) => m.status !== "resolved" && m.status !== "cancelled");
    const urgent = openMaintenance.filter((m) => m.urgency === "urgent");

    // Inspections scheduled within the next 30 days.
    const inspectionsDue = inspections
      .filter((i) => i.status === "scheduled")
      .map((i) => ({ i, d: daysUntil(i.scheduled_date) }))
      .filter((x) => x.d !== null && x.d >= 0 && x.d <= 30)
      .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));

    // Leases ending within the next 30 days.
    const leaseExpiries = tenancies
      .filter((t) => t.status !== "ended")
      .map((t) => ({ t, d: daysUntil(t.lease_end) }))
      .filter((x) => x.d !== null && x.d >= 0 && x.d <= 30)
      .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));

    return { overdueRent, openMaintenance, urgent, inspectionsDue, leaseExpiries };
  }, [tenancies, inspections, maintenance, paymentsByProperty]);

  const urgentCount = data.urgent.length + data.overdueRent.length;

  return (
    <div>
      <PropertyCalendar />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Urgent outstanding items */}
        <Tile title="Urgent & outstanding" count={urgentCount} tone={urgentCount > 0 ? "bad" : "good"}>
          {urgentCount === 0 ? (
            <Empty>Nothing urgent right now.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {data.overdueRent.map((r, i) => (
                <Row key={`rent-${i}`} tone="bad" label={`Rent overdue ${fmtMoney(r.amount)}`} meta={`${propLabel(r.propertyId)} · due ${fmtDate(r.due)}`} />
              ))}
              {data.urgent.map((m) => (
                <Row key={m.id} tone="bad" label={m.title} meta={`${propLabel(m.property_id)} · ${m.category}`} />
              ))}
            </ul>
          )}
        </Tile>

        {/* Maintenance requests */}
        <Tile title="Maintenance requests" count={data.openMaintenance.length} tone={data.openMaintenance.length > 0 ? "warn" : "good"}>
          {data.openMaintenance.length === 0 ? (
            <Empty>No open requests.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {data.openMaintenance.slice(0, 6).map((m) => (
                <Row
                  key={m.id}
                  tone={m.urgency === "urgent" ? "bad" : "warn"}
                  label={m.title}
                  meta={`${propLabel(m.property_id)} · ${m.status.replace("_", " ")}`}
                />
              ))}
            </ul>
          )}
        </Tile>

        {/* Inspections due */}
        <Tile title="Inspections due (30 days)" count={data.inspectionsDue.length} tone={data.inspectionsDue.length > 0 ? "warn" : "good"}>
          {data.inspectionsDue.length === 0 ? (
            <Empty>None scheduled soon.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {data.inspectionsDue.map(({ i, d }) => (
                <Row
                  key={i.id}
                  tone={d! <= 7 ? "warn" : "neutral"}
                  label={<span className="capitalize">{i.kind} inspection</span>}
                  meta={`${propLabel(i.property_id)} · ${fmtDate(i.scheduled_date)} (${d}d)`}
                />
              ))}
            </ul>
          )}
        </Tile>

        {/* Lease expiries */}
        <Tile title="Lease expiries (30 days)" count={data.leaseExpiries.length} tone={data.leaseExpiries.length > 0 ? "warn" : "good"}>
          {data.leaseExpiries.length === 0 ? (
            <Empty>No leases ending this month.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {data.leaseExpiries.map(({ t, d }) => (
                <Row
                  key={t.id}
                  tone={d! <= 14 ? "warn" : "neutral"}
                  label={t.tenant_name || "(unnamed tenant)"}
                  meta={`${propLabel(t.property_id)} · ends ${fmtDate(t.lease_end)} (${d}d)`}
                />
              ))}
            </ul>
          )}
        </Tile>
      </div>

      <MaintenanceManager />
    </div>
  );
}

function Tile({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "good" | "bad" | "warn" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        <Badge tone={tone}>{count}</Badge>
      </div>
      {children}
    </section>
  );
}

function Row({ tone, label, meta }: { tone: "good" | "bad" | "warn" | "neutral"; label: React.ReactNode; meta: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone === "bad" ? "bg-bad" : tone === "warn" ? "bg-warn" : tone === "good" ? "bg-good" : "bg-accent"}`} />
        {label}
      </span>
      <span className="text-xs text-muted">{meta}</span>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
