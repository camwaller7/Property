"use client";

import Badge from "@/components/ui/Badge";
import TenantDocuments from "./TenantDocuments";
import { usePortfolio } from "@/lib/portfolio";
import type { Tenancy } from "@/lib/types";

// Everyone on a lease, each with contact, emergency contact and their own
// ID/documents. Falls back to the tenancy's single stored tenant for leases
// created before co-tenants existed (prompt to edit to split them out).
export default function LeasePeople({ tenancy }: { tenancy: Tenancy }) {
  const { leaseTenants } = usePortfolio();
  const people = leaseTenants
    .filter((lt) => lt.tenancy_id === tenancy.id)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));

  if (people.length === 0) {
    return (
      <div className="mt-6">
        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">People on the lease</h4>
        <div className="rounded-xl border border-border p-4 text-sm">
          <div className="font-medium">{tenancy.tenant_name || "(unnamed tenant)"}</div>
          <div className="mt-1 text-muted">
            {tenancy.tenant_email || "—"}
            {tenancy.tenant_phone ? ` · ${tenancy.tenant_phone}` : ""}
          </div>
          <p className="mt-2 text-xs text-muted">
            Edit the tenancy to add each person&apos;s details and store their ID/documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">People on the lease</h4>
      <div className="space-y-3">
        {people.map((p) => {
          const emergency = [p.emergency_name, p.emergency_relationship ? `(${p.emergency_relationship})` : "", p.emergency_phone]
            .filter(Boolean)
            .join(" ")
            .trim();
          return (
            <div key={p.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{p.name || "(unnamed)"}</span>
                {p.is_primary && <Badge tone="good">Primary</Badge>}
              </div>
              <div className="mt-1 text-sm text-muted">
                {p.email || "—"}
                {p.phone ? ` · ${p.phone}` : ""}
              </div>
              <div className="mt-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">Emergency: </span>
                {emergency || <span className="text-muted">—</span>}
              </div>
              <TenantDocuments person={p} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
