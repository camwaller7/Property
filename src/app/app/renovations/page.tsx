"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { usePortfolio } from "@/lib/portfolio";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Field, Select, Textarea } from "@/components/app/Field";
import type { RenovationCost, RenovationProject, RenovationStatus, RenovationCategory } from "@/lib/types";

const RECEIPT_BUCKET = "renovation-receipts";

const STATUS_LABEL: Record<RenovationStatus, string> = {
  planning: "Planning",
  in_progress: "In progress",
  complete: "Complete",
  on_hold: "On hold",
};
const STATUS_TONE: Record<RenovationStatus, "good" | "bad" | "warn" | "neutral"> = {
  planning: "neutral",
  in_progress: "warn",
  complete: "good",
  on_hold: "neutral",
};
const CATEGORY_LABEL: Record<RenovationCategory, string> = {
  capital_works: "Capital works",
  repairs: "Repairs / maintenance",
  depreciable: "Depreciable asset",
  other: "Other",
};

export default function RenovationsPage() {
  const { properties, renovationProjects, renovationCosts, loading } = usePortfolio();
  const [adding, setAdding] = useState(false);

  if (loading) return <p className="text-muted">Loading…</p>;

  const totalSpent = renovationCosts.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const costsByProject = groupBy(renovationCosts, (c) => c.project_id ?? "");

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Renovations</h1>
          <p className="mt-1 text-muted">
            Projects and every dollar spent, categorised for tax and tracked against value.
          </p>
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          disabled={properties.length === 0}
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {adding ? "Close" : "+ New project"}
        </button>
      </header>

      {properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          Add a property first, then start a renovation project for it.{" "}
          <Link href="/app/properties" className="font-medium text-accent hover:underline">
            Go to Properties
          </Link>
        </div>
      ) : (
        <>
          {adding && <NewProjectForm onDone={() => setAdding(false)} />}

          {/* Portfolio renovation spend + per-property cost-vs-value */}
          <section className="mb-8 rounded-2xl border border-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Spend & value</h2>
              <Badge tone="neutral">{fmtMoney(totalSpent)} total</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => {
                const spent = renovationCosts
                  .filter((c) => c.property_id === p.id)
                  .reduce((s, c) => s + (Number(c.amount) || 0), 0);
                if (spent === 0) return null;
                const value = p.current_value ? Number(p.current_value) : null;
                const pct = value ? (spent / value) * 100 : null;
                return (
                  <div key={p.id} className="rounded-xl border border-border p-4">
                    <div className="truncate text-sm font-medium" title={p.address || ""}>
                      {p.address || "(no address)"}
                    </div>
                    <div className="mt-2 text-lg font-semibold">{fmtMoney(spent)}</div>
                    <div className="text-xs text-muted">
                      spent{value ? ` · ${pct!.toFixed(1)}% of ${fmtMoney(value)} value` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted">
              Value-added is only meaningful once you update each property&apos;s current value after works —
              keep the property&apos;s value current on the Properties page.
            </p>
          </section>

          {renovationProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
              No projects yet — create one to start tracking spend.
            </div>
          ) : (
            <div className="space-y-4">
              {renovationProjects.map((proj) => (
                <ProjectCard key={proj.id} project={proj} costs={costsByProject[proj.id] || []} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NewProjectForm({ onDone }: { onDone: () => void }) {
  const { properties, saveRenovationProject } = usePortfolio();
  const [propertyId, setPropertyId] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<RenovationStatus>("planning");
  const [budget, setBudget] = useState("");
  const [startedOn, setStartedOn] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!propertyId) return setErr("Choose a property.");
    if (!name.trim()) return setErr("Give the project a name.");
    setBusy(true);
    setErr("");
    const res = await saveRenovationProject({
      property_id: propertyId,
      name: name.trim(),
      status,
      budget: budget ? Number(budget) : null,
      started_on: startedOn || null,
      completed_on: null,
      notes: notes.trim() || null,
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
        <Field label="Project name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kitchen renovation" />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as RenovationStatus)}>
          {(Object.keys(STATUS_LABEL) as RenovationStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </Select>
        <Field label="Budget (optional)" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 25000" />
        <Field label="Started" type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} />
        <Textarea label="Notes" className="sm:col-span-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      <button
        onClick={save}
        disabled={busy}
        className="mt-3 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add project"}
      </button>
    </div>
  );
}

function ProjectCard({ project, costs }: { project: RenovationProject; costs: RenovationCost[] }) {
  const { properties, org, saveRenovationProject, deleteRenovationProject } = usePortfolio();
  const [open, setOpen] = useState(false);
  const prop = properties.find((p) => p.id === project.property_id);

  const spent = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const budget = project.budget ? Number(project.budget) : null;
  const pct = budget ? Math.min(100, (spent / budget) * 100) : null;
  const over = budget != null && spent > budget;

  function exportCsv() {
    const header = ["Date", "Description", "Category", "Amount"];
    const rows = costs.map((c) => [
      c.spent_on || "",
      (c.description || "").replace(/"/g, '""'),
      CATEGORY_LABEL[c.category] || c.category,
      String(Number(c.amount) || 0),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `renovation-${(project.name || "project").replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function markComplete() {
    await saveRenovationProject(
      {
        property_id: project.property_id,
        name: project.name,
        status: "complete",
        budget: project.budget,
        started_on: project.started_on,
        completed_on: new Date().toISOString().slice(0, 10),
        notes: project.notes,
      },
      project.id
    );
  }

  async function remove() {
    if (!confirm(`Delete "${project.name}" and all its costs? This can't be undone.`)) return;
    await deleteRenovationProject(project.id);
  }

  return (
    <section className="rounded-2xl border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <button onClick={() => setOpen((o) => !o)} className="text-left text-lg font-semibold tracking-tight">
            {project.name}
          </button>
          <div className="mt-0.5 text-xs text-muted">
            {prop?.address || "—"}
            {project.started_on ? ` · started ${fmtDate(project.started_on)}` : ""}
            {project.completed_on ? ` · completed ${fmtDate(project.completed_on)}` : ""}
          </div>
        </div>
        <Badge tone={STATUS_TONE[project.status]}>{STATUS_LABEL[project.status]}</Badge>
      </div>

      {/* Budget vs spent */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">{fmtMoney(spent)} spent</span>
          <span className="text-muted">{budget != null ? `of ${fmtMoney(budget)} budget` : "no budget set"}</span>
        </div>
        {pct != null && (
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface">
            <div
              className={`h-full rounded-full ${over ? "bg-bad" : "bg-accent"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {over && <p className="mt-1 text-xs text-bad">Over budget by {fmtMoney(spent - budget!)}.</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <button onClick={() => setOpen((o) => !o)} className="font-medium text-accent hover:underline">
          {open ? "Hide costs" : `Costs (${costs.length})`}
        </button>
        {costs.length > 0 && (
          <button onClick={exportCsv} className="text-muted hover:text-foreground">Export CSV</button>
        )}
        {project.status !== "complete" && (
          <button onClick={markComplete} className="text-muted hover:text-foreground">Mark complete</button>
        )}
        <button onClick={remove} className="text-muted hover:text-bad">Delete project</button>
      </div>

      {open && (
        <div className="mt-4 border-t border-border pt-4">
          {project.notes && <p className="mb-3 text-sm text-muted">{project.notes}</p>}
          <CostList costs={costs} orgId={org?.id ?? null} />
          <AddCostForm projectId={project.id} propertyId={project.property_id} orgId={org?.id ?? null} />
        </div>
      )}
    </section>
  );
}

function CostList({ costs, orgId }: { costs: RenovationCost[]; orgId: string | null }) {
  const { deleteRenovationCost } = usePortfolio();

  async function openReceipt(path: string) {
    const { data } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(path, 3600);
    if (data) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (costs.length === 0) return <p className="text-sm text-muted">No costs logged yet.</p>;

  return (
    <ul className="mb-4 divide-y divide-border">
      {costs.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
          <div className="min-w-0">
            <span className="font-medium">{c.description}</span>
            <span className="ml-2 text-xs text-muted">
              {CATEGORY_LABEL[c.category] || c.category}
              {c.spent_on ? ` · ${fmtDate(c.spent_on)}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {c.receipt_path && (
              <button onClick={() => openReceipt(c.receipt_path!)} className="text-xs text-accent hover:underline">
                Receipt
              </button>
            )}
            <span className="font-medium">{fmtMoney(Number(c.amount) || 0)}</span>
            <button
              onClick={() => orgId && deleteRenovationCost(c.id)}
              className="text-xs text-muted hover:text-bad"
              title="Delete cost"
            >
              ✕
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AddCostForm({
  projectId,
  propertyId,
  orgId,
}: {
  projectId: string;
  propertyId: string | null;
  orgId: string | null;
}) {
  const { addRenovationCost } = usePortfolio();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RenovationCategory>("capital_works");
  const [amount, setAmount] = useState("");
  const [spentOn, setSpentOn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!description.trim()) return setErr("Describe the cost.");
    if (!amount || Number(amount) <= 0) return setErr("Enter an amount.");
    setBusy(true);
    setErr("");

    let receiptPath: string | null = null;
    if (file) {
      if (!orgId) {
        setBusy(false);
        return setErr("Couldn't determine your organisation for the receipt upload.");
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${orgId}/${projectId}/${crypto.randomUUID()}-${safe}`;
      const up = await supabase.storage.from(RECEIPT_BUCKET).upload(path, file);
      if (up.error) {
        setBusy(false);
        return setErr(`Receipt upload failed: ${up.error.message}`);
      }
      receiptPath = path;
    }

    const res = await addRenovationCost({
      project_id: projectId,
      property_id: propertyId,
      description: description.trim(),
      category,
      amount: Number(amount),
      spent_on: spentOn || null,
      receipt_path: receiptPath,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setDescription("");
    setAmount("");
    setSpentOn("");
    setFile(null);
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Description" className="sm:col-span-2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Cabinetry — supplier invoice #123" />
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as RenovationCategory)}>
          {(Object.keys(CATEGORY_LABEL) as RenovationCategory[]).map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </Select>
        <Field label="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        <Field label="Date spent" type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Receipt (optional)</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium"
          />
        </label>
      </div>
      {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      <button
        onClick={save}
        disabled={busy}
        className="mt-3 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add cost"}
      </button>
    </div>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const m: Record<string, T[]> = {};
  for (const it of items) (m[key(it)] ||= []).push(it);
  return m;
}
