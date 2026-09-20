"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { usePortfolio } from "@/lib/portfolio";
import { fmtDate } from "@/lib/format";
import { DOCUMENTS, SECTIONS } from "@/lib/application-schema";
import type { Tenancy, TenantApplication } from "@/lib/types";

const BUCKET = "tenant-documents";

export default function ApplicationPanel({ tenancy }: { tenancy: Tenancy }) {
  const { applications, createApplication } = usePortfolio();
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const app = applications.find((a) => a.tenancy_id === tenancy.id);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = app ? `${origin}/onboard/${app.token}` : "";

  async function generate() {
    setCreating(true);
    setError("");
    const res = await createApplication(tenancy.id);
    setCreating(false);
    if (res.error) setError(res.error);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select and copy the link manually.");
    }
  }

  const emailBody = `Hi ${tenancy.tenant_name || "there"},

Thanks for your interest in the property. To progress your application, please complete your tenant onboarding using the secure link below. You'll be asked for your details, rental history, references and to upload ID and supporting documents.

${link}

The form can't be submitted until everything's complete. If you have any questions, just reply to this email.

Kind regards`;

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(emailBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy the email text.");
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">Tenant application</h4>
        {app && (
          <Badge tone={app.status === "submitted" ? "good" : "warn"}>
            {app.status === "submitted" ? "Submitted" : "Awaiting submission"}
          </Badge>
        )}
      </div>

      {!app ? (
        <div>
          <p className="mb-3 text-sm text-muted">
            Create a secure onboarding link to email to {tenancy.tenant_name || "the applicant"}. They
            complete their details, rental history, references and document uploads; on submit it flows
            straight back here.
          </p>
          <button
            onClick={generate}
            disabled={creating}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {creating ? "Generating…" : "Generate onboarding link"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Onboarding link</div>
            <div className="break-all rounded-lg border border-border bg-background px-3 py-2 text-sm">{link}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={copyLink} className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-background">
                Copy link
              </button>
              <button onClick={copyEmail} className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-background">
                Copy email text
              </button>
              <a href={link} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-background">
                Preview form
              </a>
              {copied && <span className="self-center text-xs text-good">Copied ✓</span>}
            </div>
          </div>

          {app.status === "submitted" ? (
            <SubmittedSummary app={app} tenancyId={tenancy.id} />
          ) : (
            <p className="text-sm text-muted">
              Waiting for the applicant to submit. This section will fill in automatically once they do.
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}

function SubmittedSummary({ app, tenancyId }: { app: TenantApplication; tenancyId: string }) {
  const [docError, setDocError] = useState("");
  const data = app.data || {};

  async function openDoc(path: string) {
    setDocError("");
    const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error || !signed) {
      setDocError("Couldn't open document: " + (error?.message || "unknown error"));
      return;
    }
    window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
  }

  const personal = SECTIONS.find((s) => s.key === "personal");

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Submitted {fmtDate(app.submitted_at)}</span>
        <Link
          href={`/app/management/documents/${tenancyId}`}
          className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:opacity-80"
        >
          Generate contract &amp; handbook →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {personal?.fields.map((f) => (
          <div key={f.key}>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">{f.label}</div>
            <div className="mt-0.5 text-sm">{String(data[f.key] ?? "—")}</div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Documents</div>
        {app.documents.length === 0 ? (
          <p className="text-sm text-muted">No documents uploaded.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {app.documents.map((d) => {
              const label = DOCUMENTS.find((x) => x.kind === d.kind)?.label || d.kind;
              return (
                <li key={d.path}>
                  <button
                    onClick={() => openDoc(d.path)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface"
                  >
                    {label}: {d.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {docError && <p className="mt-1 text-sm text-bad">{docError}</p>}
      </div>
    </div>
  );
}
