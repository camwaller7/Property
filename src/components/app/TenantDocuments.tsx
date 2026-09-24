"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePortfolio } from "@/lib/portfolio";
import { fmtDate } from "@/lib/format";
import type { LeaseTenant } from "@/lib/types";

const BUCKET = "tenant-documents";
const KINDS = ["ID", "Payslip", "Reference", "Contract", "Other"];

// Per-person ID / documents for one person on a lease. Stored privately in the
// tenant-documents bucket under <org_id>/<tenancy_id>/<lease_tenant_id>/, the
// file list mirrored onto lease_tenants.documents (the source of truth).
export default function TenantDocuments({ person }: { person: LeaseTenant }) {
  const { org, addTenantDocument, removeTenantDocument } = usePortfolio();
  const [file, setFile] = useState<File | undefined>();
  const [kind, setKind] = useState("ID");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});

  const docs = person.documents ?? [];

  // Sign URLs for viewing. Deferred so the effect body has no sync setState.
  useEffect(() => {
    let active = true;
    const paths = docs.map((d) => d.path);
    if (paths.length === 0) {
      Promise.resolve().then(() => active && setUrls({}));
      return () => {
        active = false;
      };
    }
    supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (!active || !data) return;
        const map: Record<string, string> = {};
        data.forEach((d, i) => {
          if (d.signedUrl) map[paths[i]] = d.signedUrl;
        });
        setUrls(map);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs.map((d) => d.path).join(",")]);

  async function upload() {
    if (!file) return setErr("Choose a file.");
    if (!org?.id) return setErr("Couldn't determine your organisation.");
    setBusy(true);
    setErr("");
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${org.id}/${person.tenancy_id ?? "lease"}/${person.id}/${crypto.randomUUID()}-${safe}`;
    const up = await supabase.storage.from(BUCKET).upload(path, file);
    if (up.error) {
      setBusy(false);
      return setErr(`Upload failed: ${up.error.message}`);
    }
    const res = await addTenantDocument(person.id, {
      kind,
      name: file.name,
      path,
      size: file.size,
      uploaded_at: new Date().toISOString(),
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setFile(undefined);
    setKind("ID");
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">ID &amp; documents</div>

      {docs.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {docs.map((d) => (
            <li key={d.path} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted">{d.kind}</span>{" "}
                <span className="truncate">{d.name}</span>
                {d.uploaded_at && <span className="ml-1 text-xs text-muted">· {fmtDate(d.uploaded_at)}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {urls[d.path] ? (
                  <a href={urls[d.path]} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-accent hover:underline">
                    Open ↗
                  </a>
                ) : (
                  <span className="text-xs text-muted">…</span>
                )}
                <button onClick={() => removeTenantDocument(person.id, d)} className="text-xs text-muted hover:text-bad" title="Delete">
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0])}
          className="block flex-1 text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium"
        />
        <button
          onClick={upload}
          disabled={busy}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-bad">{err}</p>}
    </div>
  );
}
