"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { usePortfolio } from "@/lib/portfolio";
import { isPro, planFor } from "@/lib/plans";
import { DOCUMENTS, type DocCategory } from "@/lib/documents";
import { JURISDICTIONS, STATE_CODES, jurisdiction, type StateCode } from "@/lib/jurisdictions";

const CATEGORIES: DocCategory[] = ["Starting a tenancy", "During the tenancy", "Ending the tenancy"];

export default function DocumentsPage() {
  const { org, properties, loading, setDefaultState } = usePortfolio();

  // Default the library's state to the org default, else the most common
  // property state, else SA.
  const fallbackState =
    (org?.default_state as StateCode) ||
    (properties.find((p) => p.state)?.state as StateCode) ||
    "SA";
  const [state, setState] = useState<StateCode>(fallbackState);

  if (loading) return <p className="text-muted">Loading…</p>;

  const pro = isPro(org?.plan, org?.subscription_status);
  if (!pro) {
    return (
      <div>
        <Header />
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-muted">
            The document &amp; forms library is a {planFor("pro").name} feature — essential SA/AU
            tenancy templates and official links, in one place.
          </p>
          <Link
            href="/app/billing"
            className="mt-4 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-80"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  const j = jurisdiction(state)!;

  function resolveLink(linkKey?: string) {
    if (!linkKey) return null;
    const l = (j as unknown as Record<string, { name: string; url: string }>)[linkKey];
    return l || null;
  }

  return (
    <div>
      <Header />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted">State / territory</label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value as StateCode)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {STATE_CODES.map((s) => (
            <option key={s} value={s}>{s} — {JURISDICTIONS[s].name}</option>
          ))}
        </select>
        <button
          onClick={() => setDefaultState(state)}
          className="text-sm text-accent hover:underline"
        >
          Set as default
        </button>
      </div>

      {CATEGORIES.map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{cat}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {DOCUMENTS.filter((d) => d.category === cat).map((d) => {
              const link = d.type === "link" ? resolveLink(d.linkKey) : null;
              return (
                <div key={d.key} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium">{d.title}</h3>
                    <Badge tone="neutral">
                      {d.type === "generate" ? "Generate" : d.type === "template" ? "Template" : "Official"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{d.description}</p>
                  <div className="mt-3">
                    {d.type === "template" && (
                      <Link
                        href={`/app/documents/template/${d.key}`}
                        className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-surface"
                      >
                        Open template
                      </Link>
                    )}
                    {d.type === "link" && link && (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-surface"
                      >
                        {link.name} ↗
                      </a>
                    )}
                    {d.type === "generate" && (
                      <span className="text-xs text-muted">{d.generateNote}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Authorities & resources */}
      <section className="mb-8 rounded-2xl border border-border p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {j.name} — authorities &amp; resources
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {[j.authority, j.bonds, j.tribunal, j.tenantInfo].map((l) => (
            <li key={l.url + l.name}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
                {l.name} ↗
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Templates are drafts to review, not legal advice. Always confirm requirements and current
          forms with {j.authority.name}.
        </p>
      </section>
    </div>
  );
}

function Header() {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-semibold tracking-tight">Documents &amp; forms</h1>
      <p className="mt-1 text-muted">Essential tenancy templates and official links for your state.</p>
    </header>
  );
}
