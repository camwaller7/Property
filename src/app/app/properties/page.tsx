"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import PropertyCard from "@/components/app/PropertyCard";
import PropertyForm from "@/components/app/PropertyForm";
import { usePortfolio } from "@/lib/portfolio";
import type { Property } from "@/lib/types";

export default function PropertiesPage() {
  const { properties, loading, error } = usePortfolio();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Property | undefined>(undefined);

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
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          + Add property
        </button>
      </header>

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
