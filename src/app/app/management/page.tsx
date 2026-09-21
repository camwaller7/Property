"use client";

import { useState } from "react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import TenancyCard from "@/components/app/TenancyCard";
import TenancyForm from "@/components/app/TenancyForm";
import MaintenanceManager from "@/components/app/MaintenanceManager";
import { usePortfolio } from "@/lib/portfolio";
import type { Tenancy } from "@/lib/types";
import { daysUntil, fmtDate } from "@/lib/format";

export default function ManagementPage() {
  const { properties, tenancies, inspections, loading, error } = usePortfolio();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tenancy | undefined>(undefined);

  function openAdd() {
    setEditing(undefined);
    setModalOpen(true);
  }
  function openEdit(t: Tenancy) {
    setEditing(t);
    setModalOpen(true);
  }

  const upcomingInspections = inspections
    .filter((i) => i.status === "scheduled")
    .map((i) => ({ i, d: daysUntil(i.scheduled_date) }))
    .filter((x) => x.d !== null && x.d >= 0)
    .sort((a, b) => (a.d ?? 0) - (b.d ?? 0))
    .slice(0, 5);

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Management</h1>
          <p className="mt-1 text-muted">Tenancies, move-in onboarding and inspections.</p>
        </div>
        <button
          onClick={openAdd}
          disabled={properties.length === 0}
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          + New tenancy
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-bad/40 bg-bad-surface px-4 py-3 text-sm text-bad">
          Couldn&apos;t load management data: {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          Add a property first, then create a tenancy for it.{" "}
          <Link href="/app/properties" className="font-medium text-accent hover:underline">
            Go to Properties
          </Link>
        </div>
      ) : (
        <>
          <MaintenanceManager />

          {upcomingInspections.length > 0 && (
            <section className="mb-8 rounded-2xl border border-border p-5">
              <h2 className="mb-3 text-lg font-semibold tracking-tight">Upcoming inspections</h2>
              <ul className="space-y-2">
                {upcomingInspections.map(({ i, d }) => {
                  const prop = properties.find((p) => p.id === i.property_id);
                  return (
                    <li key={i.id} className="flex items-center justify-between text-sm">
                      <span>
                        <span className="capitalize">{i.kind}</span> · {prop?.address || "—"}
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

          {tenancies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
              No tenancies yet — create one to start onboarding a tenant.
            </div>
          ) : (
            <div className="space-y-4">
              {tenancies.map((t) => (
                <TenancyCard key={t.id} tenancy={t} onEdit={openEdit} />
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit tenancy" : "New tenancy"}
      >
        <TenancyForm existing={editing} onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
