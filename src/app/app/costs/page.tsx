"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
import { supabase } from "@/lib/supabase";
import { usePortfolio } from "@/lib/portfolio";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Field, Select } from "@/components/app/Field";
import PropertyBills from "@/components/app/PropertyBills";
import type { PropertyCost, CostCategory } from "@/lib/types";

const RECEIPT_BUCKET = "renovation-receipts"; // internal bucket id; stores cost receipts

const CATEGORY_LABEL: Record<CostCategory, string> = {
  holding: "Holding cost",
  maintenance: "Maintenance",
  improvement: "Improvement",
};
const CATEGORY_HINT: Record<CostCategory, string> = {
  holding: "Rates, insurance, loan interest, strata, land tax",
  maintenance: "Repairs and servicing to keep the property as-is",
  improvement: "Capital works that add value (may be depreciable)",
};
const CATEGORY_BAR: Record<CostCategory, string> = {
  holding: "bg-warn",
  maintenance: "bg-accent",
  improvement: "bg-good",
};
const CATEGORIES: CostCategory[] = ["holding", "maintenance", "improvement"];

// Australian financial year (1 Jul – 30 Jun) label for a YYYY-MM-DD date.
function financialYear(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const startYear = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `FY${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export default function CostsPage() {
  const { properties, propertyCosts, loading } = usePortfolio();
  const [adding, setAdding] = useState(false);
  const [propFilter, setPropFilter] = useState("");
  const [fyFilter, setFyFilter] = useState("");

  const fyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of propertyCosts) {
      const fy = financialYear(c.spent_on);
      if (fy) set.add(fy);
    }
    return Array.from(set).sort().reverse();
  }, [propertyCosts]);

  if (loading) return <p className="text-muted">Loading…</p>;

  const filtered = propertyCosts.filter(
    (c) =>
      (!propFilter || c.property_id === propFilter) &&
      (!fyFilter || financialYear(c.spent_on) === fyFilter)
  );

  const byCategory: Record<CostCategory, number> = { holding: 0, maintenance: 0, improvement: 0 };
  for (const c of filtered) byCategory[c.category] += Number(c.amount) || 0;
  const total = byCategory.holding + byCategory.maintenance + byCategory.improvement;

  function propLabel(id: string | null) {
    return properties.find((p) => p.id === id)?.address || "—";
  }

  function exportCsv() {
    const header = ["Date", "Financial year", "Property", "Category", "Description", "Amount"];
    const rows = filtered.map((c) => [
      c.spent_on || "",
      financialYear(c.spent_on) || "",
      propLabel(c.property_id),
      CATEGORY_LABEL[c.category],
      (c.description || "").replace(/"/g, '""'),
      String(Number(c.amount) || 0),
    ]);
    const csv = [header, ...rows].map((r) => r.map((x) => `"${x}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `costs${fyFilter ? "-" + fyFilter : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cost tracking</h1>
          <p className="mt-1 text-muted">
            Log every property cost from receipts and bills, categorised for analysis and tax time.
          </p>
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          disabled={properties.length === 0}
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {adding ? "Close" : "+ Log a cost"}
        </button>
      </header>

      {properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          Add a property first, then start logging its costs.{" "}
          <Link href="/app/properties" className="font-medium text-accent hover:underline">
            Go to Properties
          </Link>
        </div>
      ) : (
        <>
          <PropertyBills />

          {adding && <CostForm onDone={() => setAdding(false)} />}

          {/* Filters */}
          <div className="mb-5 flex flex-wrap gap-2">
            <select
              value={propFilter}
              onChange={(e) => setPropFilter(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address || "(no address)"}</option>
              ))}
            </select>
            <select
              value={fyFilter}
              onChange={(e) => setFyFilter(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="">All financial years</option>
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>

          {/* Analytics */}
          <section className="mb-8 rounded-2xl border border-border p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Breakdown</h2>
              <Badge tone="neutral">{fmtMoney(total)} total</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {CATEGORIES.map((cat) => (
                <StatCard
                  key={cat}
                  label={CATEGORY_LABEL[cat]}
                  value={fmtMoney(byCategory[cat])}
                  hint={total > 0 ? `${Math.round((byCategory[cat] / total) * 100)}% of spend` : CATEGORY_HINT[cat]}
                />
              ))}
            </div>
            {total > 0 && (
              <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-surface">
                {CATEGORIES.map((cat) =>
                  byCategory[cat] > 0 ? (
                    <div
                      key={cat}
                      className={CATEGORY_BAR[cat]}
                      style={{ width: `${(byCategory[cat] / total) * 100}%` }}
                      title={`${CATEGORY_LABEL[cat]}: ${fmtMoney(byCategory[cat])}`}
                    />
                  ) : null
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-muted">
              Holding &amp; maintenance are typically ongoing costs; improvements are usually capital
              (added to the cost base, often depreciable). Confirm treatment with your accountant — this isn&apos;t tax advice.
            </p>
          </section>

          {/* Cost list */}
          <section className="rounded-2xl border border-border p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Costs ({filtered.length})</h2>
              {filtered.length > 0 && (
                <button onClick={exportCsv} className="text-xs font-medium text-accent hover:underline">
                  Export CSV
                </button>
              )}
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted">No costs logged for this filter yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((c) => (
                  <CostRow key={c.id} cost={c} propLabel={propLabel(c.property_id)} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function CostRow({ cost, propLabel }: { cost: PropertyCost; propLabel: string }) {
  const { deletePropertyCost } = usePortfolio();
  const [busy, setBusy] = useState(false);

  async function openReceipt(path: string) {
    const { data } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(path, 3600);
    if (data) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remove() {
    setBusy(true);
    await deletePropertyCost(cost.id);
    setBusy(false);
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
      <div className="min-w-0">
        <span className="font-medium">{cost.description}</span>
        <span className="ml-2 text-xs text-muted">
          {propLabel}
          {cost.spent_on ? ` · ${fmtDate(cost.spent_on)}` : ""}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Badge tone={cost.category === "improvement" ? "good" : cost.category === "holding" ? "warn" : "neutral"}>
          {CATEGORY_LABEL[cost.category]}
        </Badge>
        {cost.receipt_path && (
          <button onClick={() => openReceipt(cost.receipt_path!)} className="text-xs text-accent hover:underline">
            Receipt
          </button>
        )}
        <span className="font-medium">{fmtMoney(Number(cost.amount) || 0)}</span>
        <button onClick={remove} disabled={busy} className="text-xs text-muted hover:text-bad disabled:opacity-50" title="Delete cost">
          ✕
        </button>
      </div>
    </li>
  );
}

function CostForm({ onDone }: { onDone: () => void }) {
  const { properties, org, addPropertyCost } = usePortfolio();
  const [propertyId, setPropertyId] = useState("");
  const [category, setCategory] = useState<CostCategory>("holding");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [spentOn, setSpentOn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!propertyId) return setErr("Choose a property.");
    if (!description.trim()) return setErr("Describe the cost.");
    if (!amount || Number(amount) <= 0) return setErr("Enter an amount.");
    setBusy(true);
    setErr("");

    let receiptPath: string | null = null;
    if (file) {
      if (!org?.id) {
        setBusy(false);
        return setErr("Couldn't determine your organisation for the receipt upload.");
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${org.id}/${crypto.randomUUID()}-${safe}`;
      const up = await supabase.storage.from(RECEIPT_BUCKET).upload(path, file);
      if (up.error) {
        setBusy(false);
        return setErr(`Receipt upload failed: ${up.error.message}`);
      }
      receiptPath = path;
    }

    const res = await addPropertyCost({
      property_id: propertyId,
      category,
      description: description.trim(),
      amount: Number(amount),
      spent_on: spentOn || null,
      receipt_path: receiptPath,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    onDone();
  }

  return (
    <div className="mb-6 rounded-2xl border border-border p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label="Property" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">Select…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.address || "(no address)"}</option>
          ))}
        </Select>
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as CostCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </Select>
        <Field label="Description" className="sm:col-span-2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Council rates Q3 / plumber invoice #123" />
        <Field label="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        <Field label="Date" type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Receipt / bill (optional)</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-muted">{CATEGORY_HINT[category]}</p>
      {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      <button
        onClick={save}
        disabled={busy}
        className="mt-3 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save cost"}
      </button>
    </div>
  );
}
