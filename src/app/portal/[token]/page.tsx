"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";
import Badge from "@/components/ui/Badge";
import { fmtDate, fmtMoney, nextWeekdayDate } from "@/lib/format";
import type { Notice, Payment, PortalResource, Tenancy } from "@/lib/types";

const RESOURCE_BUCKET = "tenant-resources";

interface LoadedProperty {
  address: string | null;
  weekly_rent: number | null;
  rent_due_day: string | null;
}

const categoryTone: Record<string, "good" | "bad" | "warn" | "neutral"> = {
  rent: "warn",
  bill: "warn",
  maintenance: "neutral",
  info: "neutral",
};

export default function PortalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tenancy, setTenancy] = useState<Tenancy | null>(null);
  const [property, setProperty] = useState<LoadedProperty | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [resources, setResources] = useState<PortalResource[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [resourceUrls, setResourceUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      // Token-scoped RPC (SECURITY DEFINER): returns only this tenant's data.
      const { data, error } = await supabase.rpc("portal_get", { p_token: token });
      if (!active) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const payload = data as {
        tenancy: Tenancy;
        property: LoadedProperty | null;
        notices: Notice[];
        resources: PortalResource[];
        payments: Payment[];
      };
      setTenancy(payload.tenancy);
      setProperty(payload.property ?? null);
      setNotices(payload.notices || []);
      const rsrc = payload.resources || [];
      setResources(rsrc);
      setPayments(payload.payments || []);
      setLoading(false);

      // Handouts live in a public bucket — resolve direct public URLs.
      const urls: Record<string, string> = {};
      for (const r of rsrc) {
        if (r.path) {
          const { data: pub } = supabase.storage.from(RESOURCE_BUCKET).getPublicUrl(r.path);
          if (pub) urls[r.id] = pub.publicUrl;
        }
      }
      if (active) setResourceUrls(urls);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) return <Centered>Loading your portal…</Centered>;
  if (notFound || !tenancy) {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold tracking-tight">Portal not found</h1>
        <p className="mt-2 text-muted">This link is invalid. Please check with your property manager.</p>
      </Centered>
    );
  }

  // Next rent due: earliest unpaid due date, else next occurrence of the due day.
  const upcomingPayment = payments
    .filter((p) => p.status !== "paid" && p.due_date)
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))[0];
  const nextDue = upcomingPayment?.due_date || nextWeekdayDate(property?.rent_due_day);
  const rent = tenancy.weekly_rent ?? property?.weekly_rent ?? null;

  const recentPayments = payments
    .slice()
    .sort((a, b) => (b.due_date || "").localeCompare(a.due_date || ""))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-10">
        <div className="text-sm font-medium text-muted">{brand.full}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Welcome{tenancy.tenant_name ? `, ${tenancy.tenant_name.split(" ")[0]}` : ""}
        </h1>
        {property?.address && <p className="mt-1 text-muted">{property.address}</p>}
      </header>

      {/* Rent */}
      <Card title="Rent">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Weekly rent" value={fmtMoney(rent)} />
          <Stat label="Due day" value={property?.rent_due_day || "—"} />
          <Stat label="Next due" value={nextDue ? fmtDate(nextDue) : "—"} />
        </div>
        {recentPayments.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Recent payments</div>
            <ul className="space-y-1">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>{fmtDate(p.due_date)}</span>
                  <span className="flex items-center gap-2">
                    {fmtMoney(p.amount)}
                    <Badge tone={p.status === "paid" ? "good" : p.status === "late" ? "bad" : "warn"}>
                      {p.status[0].toUpperCase() + p.status.slice(1)}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Notices */}
      <Card title="Notices & reminders">
        {notices.length === 0 ? (
          <p className="text-sm text-muted">Nothing new right now.</p>
        ) : (
          <ul className="space-y-3">
            {notices.map((n) => (
              <li key={n.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{n.title}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone={categoryTone[n.category] || "neutral"}>{n.category}</Badge>
                    {n.due_date && <span className="text-xs text-muted">Due {fmtDate(n.due_date)}</span>}
                  </span>
                </div>
                {n.body && <p className="mt-2 text-sm text-muted">{n.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Documents & handouts */}
      <Card title="Documents & handouts">
        {resources.length === 0 ? (
          <p className="text-sm text-muted">No documents shared yet.</p>
        ) : (
          <ul className="space-y-2">
            {resources.map((r) => {
              const href = r.url || resourceUrls[r.id];
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3">
                  <span>
                    <span className="text-sm font-medium">{r.title}</span>
                    {r.description && <span className="block text-xs text-muted">{r.description}</span>}
                  </span>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-surface">
                      Open
                    </a>
                  ) : (
                    <span className="text-xs text-muted">Preparing…</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="mt-8 text-xs text-muted">
        Questions? Contact your property manager. Powered by {brand.name}.
      </p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border border-border p-5">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular">{value}</div>
    </div>
  );
}
