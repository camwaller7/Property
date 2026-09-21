"use client";

import { useState } from "react";
import { Field, Select, Textarea } from "./Field";
import { usePortfolio, type TenancyInput } from "@/lib/portfolio";
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

export default function TenancyForm({
  existing,
  defaultPropertyId = "",
  onDone,
}: {
  existing?: Tenancy;
  defaultPropertyId?: string;
  onDone: () => void;
}) {
  const { properties, saveTenancy } = usePortfolio();
  const [form, setForm] = useState<TenancyInput>(
    existing ? toInput(existing) : blank(defaultPropertyId)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof TenancyInput>(key: K, value: TenancyInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
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
    if (!form.tenant_name?.trim()) {
      setError("Tenant name is required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await saveTenancy(form, existing?.id);
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

        <Field label="Tenant name" value={form.tenant_name ?? ""} onChange={(e) => set("tenant_name", e.target.value)} />
        <Select label="Status" value={form.status} onChange={(e) => set("status", e.target.value as Tenancy["status"])}>
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
        </Select>
        <Field label="Tenant email" type="email" value={form.tenant_email ?? ""} onChange={(e) => set("tenant_email", e.target.value)} />
        <Field label="Tenant phone" value={form.tenant_phone ?? ""} onChange={(e) => set("tenant_phone", e.target.value)} />

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

      <div className="mt-4 grid grid-cols-1 gap-4">
        <Field label="Emergency contact" value={form.emergency_contact ?? ""} onChange={(e) => set("emergency_contact", e.target.value)} />
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
