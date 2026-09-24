"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";
import { Field, Select, Textarea } from "@/components/app/Field";
import {
  DECLARATIONS,
  DOCUMENTS,
  REFERENCE_FIELDS,
  RENTAL_FIELDS,
  SECTIONS,
  createInitialData,
  validateApplication,
  type ApplicationData,
  type FieldDef,
} from "@/lib/application-schema";
import type { ApplicationDocument, TenantApplication } from "@/lib/types";

const BUCKET = "tenant-documents";

type LoadState =
  | { phase: "loading" }
  | { phase: "notfound" }
  | { phase: "done"; submitted: true; app: TenantApplication }
  | { phase: "form"; app: TenantApplication; propertyAddress: string | null };

export default function OnboardPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      // Token-scoped RPC (SECURITY DEFINER): returns only this application, so
      // the public anon key can't enumerate other applicants' data.
      const { data, error } = await supabase.rpc("onboard_get", { p_token: token });
      if (!active) return;
      if (error || !data) {
        setState({ phase: "notfound" });
        return;
      }
      const app = data as TenantApplication & { property_address?: string | null; org_id?: string | null };
      if (app.status === "submitted") {
        setState({ phase: "done", submitted: true, app });
        return;
      }
      setState({ phase: "form", app, propertyAddress: app.property_address ?? null });
    })();
    return () => {
      active = false;
    };
  }, [token]);

  if (state.phase === "loading") {
    return <Centered>Loading your application…</Centered>;
  }
  if (state.phase === "notfound") {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold tracking-tight">Link not found</h1>
        <p className="mt-2 text-muted">
          This onboarding link is invalid or has expired. Please check with your property manager.
        </p>
      </Centered>
    );
  }
  if (state.phase === "done") {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold tracking-tight">Application received ✓</h1>
        <p className="mt-2 text-muted">
          Thanks — your application has been submitted. Once your information has been reviewed and
          cleared, your property manager will send you a tenancy contract to review and sign.
        </p>
      </Centered>
    );
  }

  return <OnboardForm app={state.app} propertyAddress={state.propertyAddress} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}

function OnboardForm({
  app,
  propertyAddress,
}: {
  app: TenantApplication;
  propertyAddress: string | null;
}) {
  const [data, setData] = useState<ApplicationData>(createInitialData());
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const uploadedKinds = useMemo(
    () => new Set(Object.entries(files).filter(([, f]) => !!f).map(([k]) => k)),
    [files]
  );
  const problems = useMemo(() => validateApplication(data, uploadedKinds), [data, uploadedKinds]);
  const ready = problems.length === 0;

  const set = useCallback((key: string, value: unknown) => {
    setData((d) => ({ ...d, [key]: value }));
  }, []);

  function setEntry(listKey: "rental_history" | "references", index: number, key: string, value: string) {
    setData((d) => {
      const list = [...(d[listKey] || [])];
      list[index] = { ...list[index], [key]: value };
      return { ...d, [listKey]: list };
    });
  }
  function addEntry(listKey: "rental_history" | "references") {
    setData((d) => ({ ...d, [listKey]: [...(d[listKey] || []), {}] }));
  }
  function removeEntry(listKey: "rental_history" | "references", index: number) {
    setData((d) => ({ ...d, [listKey]: (d[listKey] || []).filter((_, i) => i !== index) }));
  }
  function setDeclaration(key: string, value: boolean) {
    setData((d) => ({ ...d, declarations: { ...(d.declarations || {}), [key]: value } }));
  }

  async function submit() {
    setShowErrors(true);
    if (!ready) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      // 1. Upload documents to the private bucket.
      const documents: ApplicationDocument[] = [];
      for (const [kind, file] of Object.entries(files)) {
        if (!file) continue;
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${app.org_id ?? "org"}/${app.token}/${kind}-${Date.now()}-${safe}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
        if (up.error) throw new Error(`Couldn't upload ${file.name}: ${up.error.message}`);
        documents.push({ kind, name: file.name, path, size: file.size, uploaded_at: new Date().toISOString() });
      }

      // 2. Store data + documents and flow contact details onto the tenancy,
      // all inside a token-scoped RPC (no direct table access from anon).
      const { data: result, error: rpcError } = await supabase.rpc("onboard_submit", {
        p_token: app.token,
        p_data: data,
        p_documents: documents,
      });
      if (rpcError) throw new Error(rpcError.message);
      if (result?.error === "already_submitted") throw new Error("This application has already been submitted.");
      if (result?.error) throw new Error("Couldn't submit — please check with your property manager.");

      window.scrollTo({ top: 0, behavior: "auto" });
      setData(createInitialData());
      setFiles({});
      // Reflect the submitted state.
      location.reload();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8">
        <div className="text-sm font-medium text-muted">{brand.full}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tenant application</h1>
        <p className="mt-2 text-muted">
          {propertyAddress ? (
            <>Application for <strong>{propertyAddress}</strong>. </>
          ) : null}
          Please complete every field and upload the required documents. You can&apos;t submit until
          everything&apos;s filled in.
        </p>
        <div className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm">
          <p className="font-medium">What happens next</p>
          <p className="mt-1 text-muted">
            Once your information has been reviewed and cleared, you&apos;ll receive a tenancy contract to
            review and sign. Nothing is final until you&apos;ve seen and signed that contract.
          </p>
        </div>
      </header>

      {showErrors && problems.length > 0 && (
        <div className="mb-8 rounded-xl border border-bad/40 bg-bad-surface p-4 text-sm text-bad">
          <p className="font-semibold">Please complete the following ({problems.length}):</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {problems.slice(0, 12).map((p) => (
              <li key={p}>{p}</li>
            ))}
            {problems.length > 12 && <li>…and {problems.length - 12} more.</li>}
          </ul>
        </div>
      )}

      {/* Flat sections */}
      {SECTIONS.map((section) => (
        <Section key={section.key} title={section.title}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {section.fields.map((f) => (
              <FieldRenderer
                key={f.key}
                field={f}
                value={(data[f.key] as string) ?? ""}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </div>
        </Section>
      ))}

      {/* Rental history */}
      <Section title="Rental history">
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!data.first_time_renter}
            onChange={(e) => set("first_time_renter", e.target.checked)}
          />
          I&apos;m a first-time renter (no previous rental history)
        </label>
        {!data.first_time_renter && (
          <div className="space-y-6">
            {(data.rental_history || []).map((entry, i) => (
              <div key={i} className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Tenancy #{i + 1}</span>
                  {(data.rental_history || []).length > 1 && (
                    <button onClick={() => removeEntry("rental_history", i)} className="text-xs text-muted hover:text-bad">
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {RENTAL_FIELDS.map((f) => (
                    <FieldRenderer
                      key={f.key}
                      field={f}
                      value={entry[f.key] ?? ""}
                      onChange={(v) => setEntry("rental_history", i, f.key, v)}
                    />
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => addEntry("rental_history")}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
            >
              + Add another tenancy
            </button>
          </div>
        )}
      </Section>

      {/* References */}
      <Section title="References">
        <div className="space-y-6">
          {(data.references || []).map((entry, i) => (
            <div key={i} className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Reference #{i + 1}</span>
                {(data.references || []).length > 2 && (
                  <button onClick={() => removeEntry("references", i)} className="text-xs text-muted hover:text-bad">
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {REFERENCE_FIELDS.map((f) => (
                  <FieldRenderer
                    key={f.key}
                    field={f}
                    value={entry[f.key] ?? ""}
                    onChange={(v) => setEntry("references", i, f.key, v)}
                  />
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => addEntry("references")}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            + Add another reference
          </button>
        </div>
      </Section>

      {/* Documents */}
      <Section title="Documents">
        <div className="space-y-4">
          {DOCUMENTS.map((d) => (
            <div key={d.kind} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">
                    {d.label}
                    {d.required && <span className="ml-1 text-bad">*</span>}
                  </div>
                  {d.help && <div className="text-xs text-muted">{d.help}</div>}
                </div>
                {files[d.kind] && <span className="text-xs text-good">{files[d.kind]!.name}</span>}
              </div>
              <input
                type="file"
                accept={d.accept}
                onChange={(e) => setFiles((prev) => ({ ...prev, [d.kind]: e.target.files?.[0] }))}
                className="mt-3 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-medium file:text-background"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Declarations */}
      <Section title="Declarations">
        <div className="space-y-3">
          {DECLARATIONS.map((d) => (
            <label key={d.key} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={!!data.declarations?.[d.key]}
                onChange={(e) => setDeclaration(d.key, e.target.checked)}
                className="mt-1"
              />
              {d.label}
            </label>
          ))}
        </div>
      </Section>

      {submitError && <p className="mb-4 text-sm text-bad">{submitError}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-full bg-foreground px-8 py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit application"}
        </button>
        {!ready && (
          <span className="text-sm text-muted">
            {problems.length} item{problems.length === 1 ? "" : "s"} left to complete
          </span>
        )}
      </div>
      <p className="mt-6 text-xs text-muted">
        Your information is submitted securely to your property manager and used only to assess and
        set up your tenancy.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = field.label + (field.required ? " *" : "");
  const cls = field.full ? "sm:col-span-2" : "";
  if (field.type === "select") {
    return (
      <Select label={label} className={cls} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    );
  }
  if (field.type === "textarea") {
    return <Textarea label={label} className={cls} value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <Field
      label={label}
      className={cls}
      type={field.type}
      value={value}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
