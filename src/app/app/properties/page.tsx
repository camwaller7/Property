"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import PropertyCard from "@/components/app/PropertyCard";
import PropertyForm from "@/components/app/PropertyForm";
import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio";
import { activePlan } from "@/lib/plans";
import type { Property } from "@/lib/types";

export default function PropertiesPage() {
  const { properties, org, loading, error } = usePortfolio();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Property | undefined>(undefined);

  const plan = activePlan(org?.plan, org?.subscription_status);
  const atLimit = plan.propertyLimit != null && properties.length >= plan.propertyLimit;
  const nextPlanName = plan.key === "free" ? "Plus" : "Pro";

  function openAdd() {
    setEditing(undefined);
    setModalOpen(true);
  }
  function openEdit(p: Property) {
    setEditing(p);
    setModalOpen(true);
  }

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Properties</h1>
          <p className="mt-1 text-muted">Register, gearing and rent ledger for each property.</p>
        </div>
        <button
          onClick={openAdd}
          disabled={atLimit}
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          + Add property
        </button>
      </header>

      {atLimit && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <span>
            You&apos;ve reached the {plan.name} plan limit of {plan.propertyLimit} properties.
          </span>
          <Link href="/app/billing" className="font-medium text-accent hover:underline">
            Upgrade to {nextPlanName} →
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-bad/40 bg-bad-surface px-4 py-3 text-sm text-bad">
          Couldn&apos;t load properties: {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          No properties yet — add your first one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} onEdit={openEdit} />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit property" : "Add property"}>
        <PropertyForm existing={editing} onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
