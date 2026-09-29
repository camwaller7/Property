"use client";

import { useState } from "react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import TenancyForm from "@/components/app/TenancyForm";
import ManagementDashboard from "@/components/app/ManagementDashboard";
import TenantsTab from "@/components/app/TenantsTab";
import RentalHistoryReferences from "@/components/app/RentalHistoryReferences";
import InspectionChecklist from "@/components/InspectionChecklist";
import { CONDITION_PHOTO_CHECKLIST, CONDITION_PHOTO_CHECKLIST_NOTE } from "@/lib/conditionPhotoChecklist";
import { usePortfolio } from "@/lib/portfolio";
import type { Tenancy } from "@/lib/types";

type Tab = "dashboard" | "tenants" | "references";

const TAB_LABEL: Record<Tab, string> = {
  dashboard: "Dashboard",
  tenants: "Tenants",
  references: "History references",
};

export default function ManagementPage() {
  const { properties, loading, error } = usePortfolio();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tenancy | undefined>(undefined);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showPhotoChecklist, setShowPhotoChecklist] = useState(false);

  function openAdd() {
    setEditing(undefined);
    setModalOpen(true);
  }
  function openEdit(t: Tenancy) {
    setEditing(t);
    setModalOpen(true);
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Management</h1>
          <p className="mt-1 text-muted">Your portfolio at a glance, tenancies and inspections.</p>
        </div>
        <button
          onClick={openAdd}
          disabled={properties.length === 0}
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          + New tenancy
        </button>
      </header>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 border-b border-border">
        {(["dashboard", "tenants", "references"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-bad/40 bg-bad-surface px-4 py-3 text-sm text-bad">
          Couldn&apos;t load management data: {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : tab === "references" ? (
        <RentalHistoryReferences />
      ) : properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          Add a property first, then create a tenancy for it.{" "}
          <Link href="/app/properties" className="font-medium text-accent hover:underline">
            Go to Properties
          </Link>
        </div>
      ) : tab === "dashboard" ? (
        <>
          <ManagementDashboard />

          {/* Inspection prep checklist — the same list tenants see in their portal. */}
          <section className="mt-8 rounded-2xl border border-border p-5">
            <button
              onClick={() => setShowChecklist((s) => !s)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Inspection prep checklist</h2>
                <p className="mt-0.5 text-sm text-muted">
                  What tenants are asked to do before an inspection — also shown in their portal.
                </p>
              </div>
              <span className="text-sm font-medium text-accent">{showChecklist ? "Hide" : "Show"}</span>
            </button>
            {showChecklist && (
              <div className="mt-4 border-t border-border pt-4">
                <InspectionChecklist interactive={false} />
              </div>
            )}
          </section>

          {/* Landlord ingoing condition / photo checklist — CBS Inspection Sheet
              (SA). Landlord-only; not shown in the tenant portal. */}
          <section className="mt-8 rounded-2xl border border-border p-5">
            <button
              onClick={() => setShowPhotoChecklist((s) => !s)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Ingoing condition photo checklist</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Room-by-room photo list mapped to SA&apos;s official CBS Inspection Sheet — document the
                  property&apos;s condition before a tenant moves in.
                </p>
              </div>
              <span className="text-sm font-medium text-accent">{showPhotoChecklist ? "Hide" : "Show"}</span>
            </button>
            {showPhotoChecklist && (
              <div className="mt-4 border-t border-border pt-4">
                <InspectionChecklist sections={CONDITION_PHOTO_CHECKLIST} note={CONDITION_PHOTO_CHECKLIST_NOTE} />
              </div>
            )}
          </section>
        </>
      ) : (
        <TenantsTab onEdit={openEdit} />
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
