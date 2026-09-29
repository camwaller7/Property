"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { Field, Select, Textarea } from "@/components/app/Field";
import { usePortfolio } from "@/lib/portfolio";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";
import { fmtDate } from "@/lib/format";
import {
  CONDITION_OPTIONS,
  CONDITION_LABEL,
  conditionTone,
  summariseAreas,
  suggestOverallCondition,
  type AreaCondition,
  type InspectionArea,
} from "@/lib/inspectionReport";

const BUCKET = "inspection-reports";

export default function InspectionReportPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const {
    loading,
    inspectionReports,
    tenancies,
    properties,
    saveInspectionReport,
    deleteInspectionReport,
    uploadInspectionPhoto,
    removeInspectionPhoto,
  } = usePortfolio();

  const report = inspectionReports.find((r) => r.id === id) ?? null;
  const tenancy = tenancies.find((t) => t.id === report?.tenancy_id);
  const property = properties.find((p) => p.id === report?.property_id);

  // Editable local copy, seeded from the report (re-seed if the id changes).
  const [seededId, setSeededId] = useState<string | null>(null);
  const [inspectedOn, setInspectedOn] = useState("");
  const [inspector, setInspector] = useState("");
  const [overall, setOverall] = useState<AreaCondition | "">("");
  const [summary, setSummary] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [areas, setAreas] = useState<InspectionArea[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [signed, setSigned] = useState<Record<string, string>>({});

  if (report && seededId !== report.id) {
    setSeededId(report.id);
    setInspectedOn(report.inspected_on ?? "");
    setInspector(report.inspector_name ?? "");
    setOverall((report.overall_condition as AreaCondition) ?? "");
    setSummary(report.summary ?? "");
    setFollowUp(report.follow_up ?? "");
    setAreas(
      (report.areas ?? []).map((a) => ({
        area: a.area ?? "",
        condition: (a.condition as AreaCondition) ?? "good",
        notes: a.notes ?? "",
        photos: a.photos ?? [],
      }))
    );
    setStatus("");
  }

  // Resolve signed URLs for every photo path so private images render.
  const allPaths = useMemo(() => areas.flatMap((a) => a.photos), [areas]);
  useEffect(() => {
    let active = true;
    const missing = allPaths.filter((p) => !signed[p]);
    if (missing.length === 0) return;
    (async () => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrls(missing, 3600);
      if (!active || !data) return;
      setSigned((prev) => {
        const next = { ...prev };
        for (const s of data) if (s.path && s.signedUrl) next[s.path] = s.signedUrl;
        return next;
      });
    })();
    return () => {
      active = false;
    };
  }, [allPaths, signed]);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!report) {
    return (
      <div className="space-y-3">
        <p className="text-muted">This inspection report couldn&apos;t be found.</p>
        <Link href="/app" className="text-accent hover:underline">
          ← Back to workspace
        </Link>
      </div>
    );
  }

  const finalised = !!report.finalised_at;
  const rollup = summariseAreas(areas);

  function patchArea(i: number, patch: Partial<InspectionArea>) {
    setAreas((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }
  function addArea() {
    setAreas((prev) => [...prev, { area: "", condition: "good", notes: "", photos: [] }]);
  }
  function removeArea(i: number) {
    setAreas((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function addPhoto(i: number, file: File | undefined) {
    if (!file) return;
    setStatus("Uploading photo…");
    const res = await uploadInspectionPhoto(file);
    setStatus("");
    if (res.error || !res.path) {
      setStatus(res.error || "Upload failed.");
      return;
    }
    patchArea(i, { photos: [...areas[i].photos, res.path] });
  }
  async function dropPhoto(i: number, path: string) {
    patchArea(i, { photos: areas[i].photos.filter((p) => p !== path) });
    await removeInspectionPhoto(path);
  }

  async function save(extra?: { finalise?: boolean }) {
    setBusy(true);
    setStatus("Saving…");
    const patch: Record<string, unknown> = {
      inspected_on: inspectedOn || null,
      inspector_name: inspector.trim() || null,
      overall_condition: overall || null,
      summary: summary.trim() || null,
      follow_up: followUp.trim() || null,
      areas,
    };
    if (extra?.finalise !== undefined) {
      patch.finalised_at = extra.finalise ? new Date().toISOString() : null;
    }
    const res = await saveInspectionReport(report!.id, patch);
    setBusy(false);
    setStatus(res.error ? `Couldn't save: ${res.error}` : "Saved ✓");
  }

  async function handleDelete() {
    if (!globalThis.confirm?.("Delete this inspection report? This can't be undone.")) return;
    setBusy(true);
    await deleteInspectionReport(report!.id);
    router.push("/app");
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Controls — hidden when printing */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/app" className="text-sm text-accent hover:underline">
          ← Back to workspace
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={finalised ? "good" : "warn"}>{finalised ? "Finalised" : "Draft"}</Badge>
          <button
            onClick={() => save()}
            disabled={busy}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface disabled:opacity-50"
          >
            Save
          </button>
          {finalised ? (
            <button
              onClick={() => save({ finalise: false })}
              disabled={busy}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface disabled:opacity-50"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => save({ finalise: true })}
              disabled={busy}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
            >
              Save &amp; finalise
            </button>
          )}
          <button
            onClick={() => globalThis.print?.()}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            Print / Save as PDF
          </button>
          <button onClick={handleDelete} disabled={busy} className="text-sm text-muted hover:text-bad">
            Delete
          </button>
        </div>
      </div>
      {status && <p className="no-print mb-4 text-sm text-muted">{status}</p>}
      {finalised && (
        <p className="no-print mb-4 rounded-lg bg-good-surface px-3 py-2 text-xs text-good">
          Finalised — this report is now visible to the tenant in their portal. Editing and saving updates what they see.
        </p>
      )}

      {/* The printable report sheet */}
      <div className="report-sheet rounded-2xl border border-border p-6 md:p-8">
        <header className="mb-6 border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{brand.full}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Routine inspection report</h1>
          <p className="mt-1 text-sm text-muted">
            {property?.address || "Property"}
            {tenancy?.tenant_name ? ` · Tenant: ${tenancy.tenant_name}` : ""}
          </p>
        </header>

        <div className="no-print mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Inspected on" type="date" value={inspectedOn} onChange={(e) => setInspectedOn(e.target.value)} />
          <Field label="Inspected by" value={inspector} onChange={(e) => setInspector(e.target.value)} placeholder="Your name" />
          <div>
            <Select label="Overall condition" value={overall} onChange={(e) => setOverall(e.target.value as AreaCondition)}>
              <option value="">—</option>
              {CONDITION_OPTIONS.filter((o) => o.value !== "na").map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setOverall(suggestOverallCondition(areas) ?? "")}
              className="mt-1 text-xs text-accent hover:underline"
            >
              Suggest from findings
            </button>
          </div>
        </div>

        {/* Print-only header facts */}
        <div className="print-only mb-6 hidden text-sm">
          <p>Inspected on: {fmtDate(inspectedOn) || "—"}</p>
          <p>Inspected by: {inspector || "—"}</p>
          <p>Overall condition: {overall ? CONDITION_LABEL[overall as AreaCondition] : "—"}</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <Badge tone="good">{rollup.good} good</Badge>
          <Badge tone="warn">{rollup.fair} fair</Badge>
          <Badge tone="bad">{rollup.poor} poor</Badge>
          <Badge tone="neutral">{rollup.photos} photos</Badge>
        </div>

        {/* Areas */}
        <div className="space-y-4">
          {areas.map((a, i) => (
            <div key={i} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <input
                    value={a.area}
                    onChange={(e) => patchArea(i, { area: e.target.value })}
                    placeholder="Area / room"
                    className="no-print w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium outline-none focus:border-accent"
                  />
                  <h3 className="print-only hidden text-base font-semibold">{a.area || "Area"}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="print-only hidden">
                    <Badge tone={conditionTone(a.condition)}>{CONDITION_LABEL[a.condition as AreaCondition] ?? a.condition}</Badge>
                  </span>
                  <select
                    value={a.condition}
                    onChange={(e) => patchArea(i, { condition: e.target.value as AreaCondition })}
                    className="no-print rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
                  >
                    {CONDITION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => removeArea(i)} className="no-print text-xs text-muted hover:text-bad">
                    Remove
                  </button>
                </div>
              </div>

              <textarea
                value={a.notes}
                onChange={(e) => patchArea(i, { notes: e.target.value })}
                placeholder="Findings / notes for this area"
                rows={2}
                className="no-print mt-3 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
              {a.notes ? <p className="print-only mt-2 hidden whitespace-pre-wrap text-sm">{a.notes}</p> : null}

              {/* Photos */}
              {a.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.photos.map((p) => (
                    <div key={p} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signed[p] || ""}
                        alt="Inspection"
                        className="h-24 w-24 rounded-lg border border-border object-cover"
                      />
                      <button
                        onClick={() => dropPhoto(i, p)}
                        className="no-print absolute -right-2 -top-2 rounded-full bg-foreground px-1.5 text-xs text-background"
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="no-print mt-3 inline-block cursor-pointer text-xs font-medium text-accent hover:underline">
                + Add photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => addPhoto(i, e.target.files?.[0] ?? undefined)}
                />
              </label>
            </div>
          ))}
        </div>

        <button onClick={addArea} className="no-print mt-4 text-sm font-medium text-accent hover:underline">
          + Add area
        </button>

        {/* Summary + follow-up */}
        <div className="mt-6 space-y-4">
          <div>
            <Textarea label="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="no-print" />
            {summary ? (
              <div className="print-only hidden">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Summary</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm">{summary}</p>
              </div>
            ) : null}
          </div>
          <div>
            <Textarea
              label="Follow-up / actions for the owner"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              rows={3}
              className="no-print"
            />
            {followUp ? (
              <div className="print-only hidden">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Follow-up / actions</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm">{followUp}</p>
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-8 border-t border-border pt-3 text-xs text-muted">
          Prepared with {brand.full}. This report records the property&apos;s condition at the routine inspection above and is not legal advice.
        </p>
      </div>
    </div>
  );
}
