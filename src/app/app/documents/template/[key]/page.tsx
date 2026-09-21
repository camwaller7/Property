"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio";
import { isPro } from "@/lib/plans";
import { docByKey } from "@/lib/documents";
import { brand } from "@/lib/brand";

// Renders any template-type document as a printable blank form.
export default function TemplatePage() {
  const params = useParams<{ key: string }>();
  const { org, loading } = usePortfolio();
  const doc = docByKey(params.key);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!isPro(org?.plan, org?.subscription_status)) {
    return (
      <div>
        <p className="text-muted">Document templates are a Pro feature.</p>
        <Link href="/app/billing" className="text-accent hover:underline">Upgrade to Pro</Link>
      </div>
    );
  }
  if (!doc || doc.type !== "template" || !doc.template) {
    return (
      <div>
        <p className="text-muted">Template not found.</p>
        <Link href="/app/documents" className="text-accent hover:underline">← Back to Documents</Link>
      </div>
    );
  }

  const t = doc.template;
  const line = "border-b border-neutral-400 h-8";

  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/app/documents" className="text-sm text-accent hover:underline">← Documents</Link>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-80"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="border-b border-neutral-300 pb-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{brand.full}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{doc.title}</h1>
        </div>

        {t.intro && <p className="mt-4 text-sm text-neutral-700">{t.intro}</p>}

        {t.fields && t.fields.length > 0 && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {t.fields.map((f) => (
              <div key={f}>
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{f}</div>
                <div className={`mt-2 ${line}`} />
              </div>
            ))}
          </div>
        )}

        {t.sections && t.sections.map((s) => (
          <section key={s.title} className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{s.title}</h2>
            {Array.from({ length: s.lines ?? 2 }).map((_, i) => (
              <div key={i} className="mb-3 border-b border-neutral-300 h-6" />
            ))}
          </section>
        ))}

        {t.body && <p className="mt-6 whitespace-pre-line text-sm text-neutral-700">{t.body}</p>}

        <div className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <div className="h-10 border-b border-neutral-400" />
            <div className="mt-1 text-xs text-neutral-500">Landlord / agent — sign &amp; date</div>
          </div>
          <div>
            <div className="h-10 border-b border-neutral-400" />
            <div className="mt-1 text-xs text-neutral-500">Tenant — sign &amp; date</div>
          </div>
        </div>

        <p className="mt-8 border-t border-neutral-300 pt-4 text-xs text-neutral-500">
          Generic template provided by {brand.full}. This is not legal advice — confirm the correct
          form and requirements with your state tenancy authority before use.
        </p>
      </div>
    </div>
  );
}
