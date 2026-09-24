"use client";

import { useState } from "react";
import { Field, Select, Textarea } from "./Field";
import { usePortfolio, type TenancyInput, type LeaseTenantDraft } from "@/lib/portfolio";
import type { Tenancy } from "@/lib/types";
import { defaultOnboarding } from "@/lib/sa-rules";
import { maxBond } from "@/lib/jurisdictions";
import { fmtMoney } from "@/lib/format";

function toInput(t: Tenancy): TenancyInput {
  const { id: _id, created_at: _c, ...rest } = t;
  void _id;
  void _c;
  return rest;
}

function blank(propertyId: string): TenancyInput {
  return {
    property_id: propertyId || null,
    tenant_name: "",
    tenant_email: "",
    tenant_phone: "",
    emergency_contact: "",
    move_in_date: null,
    lease_start: null,
    lease_end: null,
    weekly_rent: null,
    bond_amount: null,
    bond_lodged: false,
    bond_reference: "",
    status: "upcoming",
    rent_frequency: "weekly",
    onboarding: defaultOnboarding(),
    notes: "",
    portal_token: null,
  };
}

function blankPerson(isPrimary: boolean): LeaseTenantDraft {
  return {
    name: "",
    email: "",
    phone: "",
    is_primary: isPrimary,
    emergency_name: "",
    emergency_phone: "",
    emergency_relationship: "",
  };
}

export default function TenancyForm({
  existing,
  defaultPropertyId = "",
  onDone,
}: {
  existing?: Tenancy;
  defaultPropertyId?: string;
  onDone: () => void;
}) {
  const { properties, leaseTenants, saveTenancy } = usePortfolio();
  const [form, setForm] = useState<TenancyInput>(
    existing ? toInput(existing) : blank(defaultPropertyId)
  );

  // Seed the people list from lease_tenants for an existing lease. If a lease
  // predates this feature (no rows yet) fall back to the single tenant stored
  // on the tenancy row so nothing is lost on first edit.
  const [people, setPeople] = useState<LeaseTenantDraft[]>(() => {
    if (existing) {
      const rows = leaseTenants
        .filter((lt) => lt.tenancy_id === existing.id)
        .map((lt) => ({
          id: lt.id,
          name: lt.name ?? "",
          email: lt.email ?? "",
          phone: lt.phone ?? "",
          is_primary: lt.is_primary,
          emergency_name: lt.emergency_name ?? "",
          emergency_phone: lt.emergency_phone ?? "",
          emergency_relationship: lt.emergency_relationship ?? "",
        }));
      if (rows.length > 0) {
        if (!rows.some((r) => r.is_primary)) rows[0].is_primary = true;
        return rows;
      }
      return [
        {
          name: existing.tenant_name ?? "",
          email: existing.tenant_email ?? "",
          phone: existing.tenant_phone ?? "",
          is_primary: true,
          emergency_name: existing.emergency_contact ?? "",
          emergency_phone: "",
          emergency_relationship: "",
        },
      ];
    }
    return [blankPerson(true)];
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof TenancyInput>(key: K, value: TenancyInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setPerson<K extends keyof LeaseTenantDraft>(idx: number, key: K, value: LeaseTenantDraft[K]) {
    setPeople((ps) => ps.map((p, i) => (i === idx ? { ...p, [key]: value } : p)));
  }

  function makePrimary(idx: number) {
    setPeople((ps) => ps.map((p, i) => ({ ...p, is_primary: i === idx })));
  }

  function addPerson() {
    setPeople((ps) => [...ps, blankPerson(ps.length === 0)]);
  }

  function removePerson(idx: number) {
    setPeople((ps) => {
      const next = ps.filter((_, i) => i !== idx);
      if (next.length > 0 && !next.some((p) => p.is_primary)) next[0].is_primary = true;
      return next;
    });
  }

  // When a property is picked on a new tenancy, prefill rent/lease from it.
  function pickProperty(id: string) {
    const p = properties.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      property_id: id || null,
      weekly_rent: f.weekly_rent ?? p?.weekly_rent ?? null,
      lease_start: f.lease_start ?? p?.lease_start ?? null,
      lease_end: f.lease_end ?? p?.lease_end ?? null,
    }));
  }

  const selectedState = properties.find((p) => p.id === form.property_id)?.state ?? null;
  const cap = maxBond(form.weekly_rent, selectedState);

  async function submit() {
    if (!form.property_id) {
      setError("Choose which property this tenancy is for.");
      return;
    }
    const named = people.filter((p) => p.name?.trim());
    if (named.length === 0) {
      setError("Add at least one person with a name.");
      return;
    }
    // Trim to named people and guarantee exactly one primary.
    const cleaned = named.map((p) => ({ ...p, name: p.name?.trim() ?? "" }));
    if (!cleaned.some((p) => p.is_primary)) cleaned[0].is_primary = true;

    setSaving(true);
    setError("");
    const res = await saveTenancy(form, existing?.id, cleaned);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onDone();
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Property"
          className="sm:col-span-2"
          value={form.property_id ?? ""}
          onChange={(e) => pickProperty(e.target.value)}
        >
          <option value="">Select a property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.address || "(no address)"}
            </option>
          ))}
        </Select>

        <Select label="Status" value={form.status} onChange={(e) => set("status", e.target.value as Tenancy["status"])}>
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
        </Select>
        <Field label="Move-in date" type="date" value={form.move_in_date ?? ""} onChange={(e) => set("move_in_date", e.target.value || null)} />

        <Field label="Weekly rent ($)" type="number" value={form.weekly_rent ?? ""} onChange={(e) => set("weekly_rent", e.target.value === "" ? null : Number(e.target.value))} />
        <Select
          label="Rent frequency"
          value={form.rent_frequency}
          onChange={(e) => set("rent_frequency", e.target.value as Tenancy["rent_frequency"])}
        >
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
        </Select>
        <Field label="Lease start" type="date" value={form.lease_start ?? ""} onChange={(e) => set("lease_start", e.target.value || null)} />
        <Field label="Lease end" type="date" value={form.lease_end ?? ""} onChange={(e) => set("lease_end", e.target.value || null)} />

        <Field label="Bond ($)" type="number" value={form.bond_amount ?? ""} onChange={(e) => set("bond_amount", e.target.value === "" ? null : Number(e.target.value))} />
        <Field label="Bond reference" value={form.bond_reference ?? ""} onChange={(e) => set("bond_reference", e.target.value)} />
      </div>

      {cap !== null && (
        <p className="mt-2 text-xs text-muted">
          SA bond cap for {fmtMoney(form.weekly_rent)}/week: <strong>{fmtMoney(cap)}</strong>{" "}
          {form.bond_amount != null && form.bond_amount > cap && (
            <span className="text-bad">— entered bond exceeds the legal maximum.</span>
          )}
        </p>
      )}

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.bond_lodged}
          onChange={(e) => set("bond_lodged", e.target.checked)}
        />
        Bond lodged with Consumer &amp; Business Services (CBS)
      </label>

      {/* People on the lease — one or more. The primary person's contact is
          used for the portal and email fan-out; everyone gets copied in. */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">People on this lease</h3>
          <span className="text-xs text-muted">{people.length} {people.length === 1 ? "person" : "people"}</span>
        </div>
        <div className="space-y-4">
          {people.map((p, idx) => (
            <div key={p.id ?? `new-${idx}`} className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="radio"
                    name="primary-tenant"
                    checked={p.is_primary}
                    onChange={() => makePrimary(idx)}
                  />
                  Primary contact
                </label>
                {people.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePerson(idx)}
                    className="text-xs font-medium text-bad hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Full name" value={p.name ?? ""} onChange={(e) => setPerson(idx, "name", e.target.value)} />
                <Field label="Phone" value={p.phone ?? ""} onChange={(e) => setPerson(idx, "phone", e.target.value)} />
                <Field label="Email" type="email" className="sm:col-span-2" value={p.email ?? ""} onChange={(e) => setPerson(idx, "email", e.target.value)} />
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Emergency contact</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Name" value={p.emergency_name ?? ""} onChange={(e) => setPerson(idx, "emergency_name", e.target.value)} />
                  <Field label="Relationship" value={p.emergency_relationship ?? ""} onChange={(e) => setPerson(idx, "emergency_relationship", e.target.value)} placeholder="e.g. Parent" />
                  <Field label="Phone" value={p.emergency_phone ?? ""} onChange={(e) => setPerson(idx, "emergency_phone", e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addPerson}
          className="mt-3 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
        >
          + Add another person
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <Textarea label="Notes" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </div>

      {error && <p className="mt-4 text-sm text-bad">{error}</p>}

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onDone} className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {saving ? "Saving…" : existing ? "Save" : "Create tenancy"}
        </button>
      </div>
    </div>
  );
}
