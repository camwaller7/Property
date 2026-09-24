"use client";

import TenancyCard from "./TenancyCard";
import LeasePeople from "./LeasePeople";
import PropertyPhotos from "./PropertyPhotos";
import SendTenantDocuments from "./SendTenantDocuments";
import InspectionChecklist from "@/components/InspectionChecklist";
import { useState } from "react";
import type { Tenancy } from "@/lib/types";

// The full detail for one lease: the tenancy card (rent, bond, lease, move-in
// checklist, onboarding/portal links, inspections), every person on the lease
// with their contact + emergency + ID/documents, the property's condition
// photos, and the inspection checklist for reference.
export default function LeaseDetail({
  tenancy,
  onEdit,
}: {
  tenancy: Tenancy;
  onEdit: (t: Tenancy) => void;
}) {
  const [showChecklist, setShowChecklist] = useState(false);
  return (
    <div className="space-y-2">
      <TenancyCard tenancy={tenancy} onEdit={onEdit} />

      <div className="rounded-2xl border border-border p-5">
        <LeasePeople tenancy={tenancy} />

        <SendTenantDocuments tenancy={tenancy} />

        {tenancy.property_id && <PropertyPhotos propertyId={tenancy.property_id} />}

        <div className="mt-6">
          <button
            onClick={() => setShowChecklist((s) => !s)}
            className="flex w-full items-center justify-between text-left"
          >
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">Inspection checklist</h4>
            <span className="text-sm font-medium text-accent">{showChecklist ? "Hide" : "Show"}</span>
          </button>
          {showChecklist && (
            <div className="mt-3 border-t border-border pt-3">
              <InspectionChecklist interactive={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
