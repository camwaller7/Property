"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio";
import { fmtDate, fmtMoney } from "@/lib/format";
import { maxBond, jurisdiction } from "@/lib/jurisdictions";
import { brand } from "@/lib/brand";

// Prefilled tenancy documents generated from the submitted application. This is
// a working draft to review and complete — not legal advice. Landlord-specific
// details the software doesn't hold are shown as fill-in blanks.
const BLANK = "________________";

export default function DocumentsPage() {
  const params = useParams<{ id: string }>();
  const { tenancies, properties, applications, loading } = usePortfolio();

  if (loading) return <p className="text-muted">Loading…</p>;

  const tenancy = tenancies.find((t) => t.id === params.id);
  if (!tenancy) {
    return (
      <div>
        <p className="text-muted">Tenancy not found.</p>
        <Link href="/app/management" className="text-accent hover:underline">
          ← Back to Management
        </Link>
      </div>
    );
  }

  const property = properties.find((p) => p.id === tenancy.property_id);
  const app = applications.find((a) => a.tenancy_id === tenancy.id);
  const d = (app?.data || {}) as Record<string, unknown>;
  const val = (k: string) => (d[k] != null && String(d[k]).trim() !== "" ? String(d[k]) : null);

  const tenantName = val("full_legal_name") || tenancy.tenant_name || BLANK;
  const rent = tenancy.weekly_rent ?? property?.weekly_rent ?? null;
  const bond = tenancy.bond_amount ?? null;
  const juris = jurisdiction(property?.state);
  const cap = maxBond(rent, property?.state);
  const references = (d.references as Record<string, string>[] | undefined) || [];

  return (
    <div>
      {/* Controls (hidden when printing) */}
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/management" className="text-sm text-accent hover:underline">
          ← Back to Management
        </Link>
        <div className="flex items-center gap-3">
          {!app || app.status !== "submitted" ? (
            <span className="text-sm text-warn">No submitted application yet — fields will be blank.</span>
          ) : null}
          <button
            onClick={() => window.print()}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-12">
        {/* ---- Tenancy Agreement ---- */}
        <article className="space-y-5">
          <Doc.Header title="Residential Tenancy Agreement" subtitle={juris?.name || "Australia"} />

          <Doc.Section title="1. Parties">
            <Doc.Row label="Landlord" value={BLANK} />
            <Doc.Row label="Landlord contact" value={BLANK} />
            <Doc.Row label="Managing agent (if any)" value={BLANK} />
            <Doc.Row label="Tenant(s)" value={tenantName} />
            <Doc.Row label="Tenant email" value={val("email") || tenancy.tenant_email || BLANK} />
            <Doc.Row label="Tenant phone" value={val("phone") || tenancy.tenant_phone || BLANK} />
            <Doc.Row label="Tenant date of birth" value={val("date_of_birth") ? fmtDate(val("date_of_birth")) : BLANK} />
          </Doc.Section>

          <Doc.Section title="2. Premises">
            <Doc.Row label="Rented property" value={property?.address || BLANK} />
            <Doc.Row label="Total occupants" value={val("num_occupants") || BLANK} />
            <Doc.Row label="Pets" value={val("has_pets") === "Yes" ? val("pet_details") || "Yes" : "No"} />
          </Doc.Section>

          <Doc.Section title="3. Term">
            <Doc.Row label="Agreement type" value={tenancy.lease_end ? "Fixed term" : "Periodic"} />
            <Doc.Row label="Start date" value={tenancy.lease_start ? fmtDate(tenancy.lease_start) : fmtDate(tenancy.move_in_date)} />
            <Doc.Row label="End date" value={tenancy.lease_end ? fmtDate(tenancy.lease_end) : "N/A (periodic)"} />
            <Doc.Row label="Move-in date" value={fmtDate(tenancy.move_in_date)} />
          </Doc.Section>

          <Doc.Section title="4. Rent">
            <Doc.Row label="Rent" value={rent != null ? `${fmtMoney(rent)} per week` : BLANK} />
            <Doc.Row label="Rent due" value={property?.rent_due_day || BLANK} />
            <Doc.Row label="Payment method" value={BLANK} />
          </Doc.Section>

          <Doc.Section title="5. Bond">
            <Doc.Row label="Bond amount" value={fmtMoney(bond)} />
            <Doc.Row label="Maximum bond (SA)" value={cap != null ? fmtMoney(cap) : BLANK} />
            <Doc.Row label={`Lodged with ${juris?.bonds.name || "the bond authority"}`} value={tenancy.bond_lodged ? "Yes" : "No"} />
            <Doc.Row label="Bond reference" value={tenancy.bond_reference || BLANK} />
          </Doc.Section>

          <Doc.Section title="6. Emergency contact">
            <Doc.Row label="Contact" value={tenancy.emergency_contact || BLANK} />
          </Doc.Section>

          <Doc.Section title="7. Special terms">
            <p className="text-sm text-neutral-600">{BLANK}</p>
          </Doc.Section>

          <Doc.Section title="8. Signatures">
            <div className="grid grid-cols-2 gap-8 pt-4">
              <Doc.Sign label="Landlord / agent" />
              <Doc.Sign label="Tenant" />
            </div>
          </Doc.Section>

          <p className="border-t border-neutral-300 pt-4 text-xs text-neutral-500">
            Draft generated by {brand.full} from the tenant&apos;s submitted application. Review and
            complete all blanks. This is not legal advice — confirm against the current residential
            tenancy laws and {juris?.authority.name || "your state authority"} requirements before signing.
          </p>
        </article>

        {/* ---- Tenant Handbook ---- */}
        <article className="space-y-5 break-before-page">
          <Doc.Header title="Tenant Handbook" subtitle={property?.address || ""} />

          <Doc.Prose title={`Welcome${val("preferred_name") || val("full_legal_name") ? `, ${val("preferred_name") || val("full_legal_name")}` : ""}`}>
            Welcome to your new home. This handbook covers how the tenancy runs day to day — paying rent,
            requesting repairs, inspections and who to contact. Please keep it handy.
          </Doc.Prose>

          <Doc.Section title="Key contacts">
            <Doc.Row label="Property manager" value={BLANK} />
            <Doc.Row label="Phone" value={BLANK} />
            <Doc.Row label="Email" value={BLANK} />
            <Doc.Row label="After-hours emergency" value={BLANK} />
          </Doc.Section>

          <Doc.Prose title="Rent">
            Rent is {rent != null ? `${fmtMoney(rent)} per week` : BLANK}
            {property?.rent_due_day ? `, due ${property.rent_due_day}` : ""}. Please keep rent paid in
            advance. Let your property manager know as early as possible if you expect any difficulty.
          </Doc.Prose>

          <Doc.Prose title="Repairs & maintenance">
            Report non-urgent repairs in writing to your property manager. For urgent repairs (as defined
            under SA law — e.g. burst water pipe, gas leak, dangerous electrical fault, no hot water),
            contact the after-hours number above immediately.
          </Doc.Prose>

          <Doc.Prose title="Inspections">
            {juris?.inspection.note ||
              `Routine inspections are carried out periodically with at least ${juris?.inspection.minNoticeDays ?? 7} days' written notice.`}{" "}
            We&apos;ll always give you proper notice and confirm a time.
          </Doc.Prose>

          <Doc.Prose title="Your responsibilities">
            Keep the property clean and undamaged, pay rent on time, don&apos;t disturb neighbours, and
            don&apos;t make alterations without written consent. Smoke alarms must not be tampered with.
          </Doc.Prose>

          <Doc.Prose title="Ending the tenancy">
            Follow the notice periods in your agreement and under SA law. Leave the property clean and in
            the same condition as the ingoing report (fair wear and tear excepted) so your bond can be
            refunded promptly.
          </Doc.Prose>

          {references.length > 0 && (
            <p className="text-xs text-neutral-500">Application references on file: {references.length}.</p>
          )}

          <p className="border-t border-neutral-300 pt-4 text-xs text-neutral-500">
            General information prepared by {brand.full} to help run the tenancy. This is not legal
            advice — the tenancy agreement and {juris?.authority.name || "your state authority"} rules
            prevail if anything differs.
          </p>
        </article>
      </div>
    </div>
  );
}

const Doc = {
  Header: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header className="border-b border-neutral-300 pb-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{brand.full}</div>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
    </header>
  ),
  Section: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  ),
  Row: ({ label, value }: { label: string; value: string | null }) => (
    <div className="flex flex-wrap justify-between gap-2 border-b border-neutral-200 py-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-foreground">{value ?? "—"}</span>
    </div>
  ),
  Prose: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2 className="mb-1 text-base font-semibold text-foreground">{title}</h2>
      <p className="text-sm leading-relaxed text-neutral-700">{children}</p>
    </section>
  ),
  Sign: ({ label }: { label: string }) => (
    <div>
      <div className="h-10 border-b border-neutral-400" />
      <div className="mt-1 text-xs text-neutral-500">{label} — sign &amp; date</div>
    </div>
  ),
};
