"use client";

import { useState } from "react";
import { Field } from "./Field";
import { usePortfolio } from "@/lib/portfolio";
import type { Property, PropertyInput } from "@/lib/types";
import { emptyProperty } from "@/lib/types";

function toInput(p: Property): PropertyInput {
  const { id: _id, created_at: _c, ...rest } = p;
  void _id;
  void _c;
  return rest;
}

export default function PropertyForm({
  existing,
  onDone,
}: {
  existing?: Property;
  onDone: () => void;
}) {
  const { saveProperty } = usePortfolio();
  const [form, setForm] = useState<PropertyInput>(existing ? toInput(existing) : { ...emptyProperty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setText(key: keyof PropertyInput, value: string) {
    setForm((f) => ({ ...f, [key]: value === "" ? null : value }));
  }
  function setNum(key: keyof PropertyInput, value: string) {
    setForm((f) => ({ ...f, [key]: value === "" ? null : Number(value) }));
  }

  async function submit() {
    if (!form.address || !String(form.address).trim()) {
      setError("Address is required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await saveProperty(form, existing?.id);
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
        <Field
          label="Address"
          className="sm:col-span-2"
          value={form.address ?? ""}
          onChange={(e) => setText("address", e.target.value)}
          placeholder="12 Example St, Suburb SA"
        />
        <Field
          label="Weekly rent ($)"
          type="number"
          value={form.weekly_rent ?? ""}
          onChange={(e) => setNum("weekly_rent", e.target.value)}
        />
        <Field
          label="Rent due day"
          value={form.rent_due_day ?? ""}
          onChange={(e) => setText("rent_due_day", e.target.value)}
          placeholder="e.g. Friday"
        />
        <Field
          label="Lease start"
          type="date"
          value={form.lease_start ?? ""}
          onChange={(e) => setText("lease_start", e.target.value)}
        />
        <Field
          label="Lease end"
          type="date"
          value={form.lease_end ?? ""}
          onChange={(e) => setText("lease_end", e.target.value)}
        />
        <Field
          label="Bond ($)"
          type="number"
          value={form.bond ?? ""}
          onChange={(e) => setNum("bond", e.target.value)}
        />
        <Field
          label="Purchase price ($)"
          type="number"
          value={form.purchase_price ?? ""}
          onChange={(e) => setNum("purchase_price", e.target.value)}
        />
        <Field
          label="Current value ($)"
          type="number"
          value={form.current_value ?? ""}
          onChange={(e) => setNum("current_value", e.target.value)}
        />
        <Field
          label="Loan balance ($)"
          type="number"
          value={form.loan_balance ?? ""}
          onChange={(e) => setNum("loan_balance", e.target.value)}
        />
        <Field
          label="Lender"
          className="sm:col-span-2"
          value={form.lender ?? ""}
          onChange={(e) => setText("lender", e.target.value)}
        />
      </div>

      {error && <p className="mt-4 text-sm text-bad">{error}</p>}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onDone}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
