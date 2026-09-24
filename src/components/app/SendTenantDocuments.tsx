"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePortfolio } from "@/lib/portfolio";
import { brand } from "@/lib/brand";
import type { Tenancy } from "@/lib/types";

const BUCKET = "tenant-resources";

// Upload the official/signed tenancy contract and the property handbook and
// send them to the tenant. Documents are stored as the property's portal
// resources (so they show in the tenant portal's "Documents & handouts") and
// the tenant is emailed a heads-up with their portal link. This is the last
// step of the flow: the manager fills the official state contract, uploads the
// signed copy here, and it reaches the tenant for review/signing and records.
export default function SendTenantDocuments({ tenancy }: { tenancy: Tenancy }) {
  const { org, leaseTenants, addResource } = usePortfolio();
  const [kind, setKind] = useState("Tenancy contract");
  const [file, setFile] = useState<File | undefined>();
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const recipients = Array.from(
    new Set(
      [tenancy.tenant_email, ...leaseTenants.filter((lt) => lt.tenancy_id === tenancy.id).map((lt) => lt.email)]
        .map((e) => e?.trim())
        .filter((e): e is string => !!e)
    )
  );

  async function send() {
    if (!file) return setErr("Choose a PDF to upload.");
    if (!org?.id) return setErr("Couldn't determine your organisation.");
    if (!tenancy.property_id) return setErr("This lease isn't linked to a property.");
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${org.id}/lease/${tenancy.id}/${Date.now()}-${safe}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (up.error) throw new Error(up.error.message);

      const res = await addResource({
        property_id: tenancy.property_id,
        title: kind,
        description: `${kind} shared ${new Date().toLocaleDateString()}`,
        path,
        url: null,
      });
      if (res.error) throw new Error(res.error);

      // Notify everyone on the lease with a link to their portal.
      if (notify && recipients.length > 0) {
        const portalUrl = tenancy.portal_token
          ? `${globalThis.location?.origin ?? ""}/portal/${tenancy.portal_token}`
          : null;
        const body =
          `Your ${kind.toLowerCase()} is ready to review${kind.toLowerCase().includes("contract") ? " and sign" : ""}.\n\n` +
          (portalUrl
            ? `Open your tenant portal to view it under "Documents & handouts":\n${portalUrl}\n\n`
            : "You'll find it in your tenant portal under \"Documents & handouts\".\n\n") +
          `— ${brand.full}`;
        await Promise.all(
          recipients.map((to) =>
            fetch("/api/email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to, subject: `${kind} — please review`, body, tenancyId: tenancy.id }),
            }).catch(() => {})
          )
        );
      }

      setFile(undefined);
      setMsg(notify && recipients.length > 0 ? `Uploaded and emailed ${recipients.length} recipient(s) ✓` : "Uploaded to the tenant portal ✓");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Send documents to tenant</h4>
      <p className="mb-3 text-xs text-muted">
        Upload the official signed contract or the property handbook (PDF). It appears in the tenant
        portal and, if you tick below, is emailed to everyone on the lease
        {recipients.length > 0 ? ` (${recipients.length})` : " (no email on file)"}.
      </p>
      <div className="rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-end gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option>Tenancy contract</option>
            <option>Signed contract</option>
            <option>Tenant handbook</option>
            <option>Other document</option>
          </select>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0])}
            className="block flex-1 text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium"
          />
          <button
            onClick={send}
            disabled={busy}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Upload & send"}
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Email the tenant a heads-up with their portal link
        </label>
        {msg && <p className="mt-2 text-sm text-good">{msg}</p>}
        {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      </div>
    </div>
  );
}
