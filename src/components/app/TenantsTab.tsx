"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LeaseDetail from "./LeaseDetail";
import { usePortfolio } from "@/lib/portfolio";
import type { Tenancy } from "@/lib/types";
import { fmtMoney } from "@/lib/format";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// At-a-glance flags for a lease: overdue/soon rent and open maintenance.
function leaseFlags(args: {
  tenancy: Tenancy;
  payments: { status: string; due_date: string | null; received_date: string | null; amount: number | null }[];
  openMaintenance: number;
  urgentMaintenance: number;
}) {
  const today = todayIso();
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  const soonIso = soon.toISOString().slice(0, 10);
  const unpaid = args.payments.filter((p) => p.status !== "paid" && !p.received_date && p.due_date);
  const overdue = unpaid.filter((p) => (p.due_date as string) < today);
  const dueSoon = unpaid.filter((p) => (p.due_date as string) >= today && (p.due_date as string) <= soonIso);
  return { overdue, dueSoon, openMaintenance: args.openMaintenance, urgentMaintenance: args.urgentMaintenance };
}

export default function TenantsTab({ onEdit }: { onEdit: (t: Tenancy) => void }) {
  const { properties, tenancies, leaseTenants, paymentsByProperty, maintenance } = usePortfolio();
  const [detail, setDetail] = useState<Tenancy | null>(null);

  function namesFor(t: Tenancy): string {
    const people = leaseTenants.filter((lt) => lt.tenancy_id === t.id);
    if (people.length > 0) {
      return people
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
        .map((p) => p.name || "(unnamed)")
        .join(", ");
    }
    return t.tenant_name || "(unnamed tenant)";
  }

  // Group leases by property for the list view.
  const groups = useMemo(() => {
    const byProp: Record<string, Tenancy[]> = {};
    for (const t of tenancies) {
      const key = t.property_id ?? "none";
      (byProp[key] ||= []).push(t);
    }
    return byProp;
  }, [tenancies]);

  if (tenancies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
        No tenancies yet — create one to start onboarding a tenant.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([propId, leases]) => {
        const property = properties.find((p) => p.id === propId);
        return (
          <div key={propId}>
            <h3 className="mb-2 text-sm font-semibold tracking-tight">
              {property?.address || "No property linked"}
            </h3>
            <div className="space-y-2">
              {leases.map((t) => {
                const payments = paymentsByProperty[t.property_id ?? ""] || [];
                const mine = maintenance.filter(
                  (m) =>
                    (m.tenancy_id === t.id || m.property_id === t.property_id) &&
                    m.status !== "resolved" &&
                    m.status !== "cancelled"
                );
                const flags = leaseFlags({
                  tenancy: t,
                  payments,
                  openMaintenance: mine.length,
                  urgentMaintenance: mine.filter((m) => m.urgency === "urgent").length,
                });
                return (
                  <button
                    key={t.id}
                    onClick={() => setDetail(t)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-surface"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{namesFor(t)}</div>
                      <div className="mt-0.5 text-xs text-muted capitalize">{t.status}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {flags.overdue.length > 0 && (
                        <Badge tone="bad">Rent overdue {fmtMoney(flags.overdue.reduce((s, p) => s + (p.amount || 0), 0))}</Badge>
                      )}
                      {flags.overdue.length === 0 && flags.dueSoon.length > 0 && <Badge tone="warn">Rent due soon</Badge>}
                      {flags.urgentMaintenance > 0 && <Badge tone="bad">{flags.urgentMaintenance} urgent</Badge>}
                      {flags.urgentMaintenance === 0 && flags.openMaintenance > 0 && (
                        <Badge tone="warn">{flags.openMaintenance} maintenance</Badge>
                      )}
                      {flags.overdue.length === 0 &&
                        flags.dueSoon.length === 0 &&
                        flags.openMaintenance === 0 && <Badge tone="good">All clear</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <Modal open={detail !== null} onClose={() => setDetail(null)} title="Lease details">
        {detail && (
          <LeaseDetail
            tenancy={detail}
            onEdit={(t) => {
              setDetail(null);
              onEdit(t);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
