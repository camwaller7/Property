"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import EmailComposer from "./EmailComposer";
import { Field, Select, Textarea } from "./Field";
import { usePortfolio } from "@/lib/portfolio";
import { fmtDate } from "@/lib/format";
import type { NoticeCategory, Tenancy } from "@/lib/types";

const CATEGORIES: NoticeCategory[] = ["rent", "bill", "maintenance", "info"];

export default function PortalPanel({ tenancy }: { tenancy: Tenancy }) {
  const { notices, enablePortal, addNotice, deleteNotice } = usePortfolio();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);

  // Notice composer state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<NoticeCategory>("info");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [posting, setPosting] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // The link sent to tenants is the account-creation page: they set a password,
  // then sign in from the landing page's Tenant login. `previewLink` is the raw
  // token portal, kept so the manager can preview what the tenant will see.
  const link = tenancy.portal_token ? `${origin}/tenant/claim/${tenancy.portal_token}` : "";
  const previewLink = tenancy.portal_token ? `${origin}/portal/${tenancy.portal_token}` : "";
  const myNotices = notices.filter(
    (n) => n.tenancy_id === tenancy.id || (!n.tenancy_id && n.property_id === tenancy.property_id)
  );

  async function enable() {
    setBusy(true);
    setError("");
    const res = await enablePortal(tenancy.id);
    setBusy(false);
    if (res.error) setError(res.error);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the link manually.");
    }
  }

  async function postNotice() {
    if (!title.trim()) {
      setError("Give the notice a title.");
      return;
    }
    setPosting(true);
    setError("");
    const res = await addNotice({
      property_id: tenancy.property_id,
      tenancy_id: tenancy.id,
      category,
      title: title.trim(),
      body: body.trim() || null,
      due_date: dueDate || null,
    });
    setPosting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setTitle("");
    setBody("");
    setDueDate("");
    setCategory("info");
  }

  const emailBody = `Hi ${tenancy.tenant_name || "there"},

Set up your tenant portal account using the link below. Once you've created your account you can sign in any time from the Tenant login — you'll find your rent details, notices, inspections and important documents there:

${link}

Kind regards`;

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">Tenant portal</h4>
        {tenancy.portal_token && <Badge tone="good">Active</Badge>}
      </div>

      {!tenancy.portal_token ? (
        <div>
          <p className="mb-3 text-sm text-muted">
            Give {tenancy.tenant_name || "the tenant"} a secure portal with their rent details, notices
            and documents they can access any time.
          </p>
          <button
            onClick={enable}
            disabled={busy}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {busy ? "Enabling…" : "Enable tenant portal"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Tenant sign-up link</div>
            <div className="break-all rounded-lg border border-border bg-background px-3 py-2 text-sm">{link}</div>
            <p className="mt-1 text-xs text-muted">Sending this lets the tenant create their account, then sign in from the Tenant login.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={copyLink} className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-background">
                Copy link
              </button>
              <a href={previewLink} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-background">
                Preview portal
              </a>
              {tenancy.tenant_email && (
                <button onClick={() => setEmailOpen(true)} className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-background">
                  Email tenant
                </button>
              )}
              {copied && <span className="self-center text-xs text-good">Copied ✓</span>}
            </div>
          </div>

          {/* Post a notice */}
          <div className="rounded-xl border border-border p-4">
            <div className="mb-3 text-sm font-semibold">Post a notice</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Water bill due" />
              <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as NoticeCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c[0].toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </Select>
              <Field label="Due date (optional)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <Textarea label="Details (optional)" className="sm:col-span-2" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <button
              onClick={postNotice}
              disabled={posting}
              className="mt-3 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {posting ? "Posting…" : "Post notice"}
            </button>
          </div>

          {myNotices.length > 0 && (
            <ul className="space-y-2">
              {myNotices.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <span>
                    <Badge tone="neutral">{n.category}</Badge> <span className="ml-1 font-medium">{n.title}</span>
                    {n.due_date && <span className="ml-2 text-xs text-muted">Due {fmtDate(n.due_date)}</span>}
                  </span>
                  <button onClick={() => deleteNotice(n.id)} className="text-xs text-muted hover:text-bad">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-bad">{error}</p>}

      <EmailComposer
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        defaultTo={tenancy.tenant_email || ""}
        defaultSubject="Your tenant portal"
        defaultBody={emailBody}
        tenancyId={tenancy.id}
      />
    </div>
  );
}
