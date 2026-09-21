"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";
import Badge from "@/components/ui/Badge";
import { Field, Select, Textarea } from "@/components/app/Field";
import { fmtDate, fmtMoney, nextWeekdayDate } from "@/lib/format";
import type { MaintenanceRequest, Notice, Payment, PortalResource, Tenancy } from "@/lib/types";

const RESOURCE_BUCKET = "tenant-resources";
const PHOTO_BUCKET = "maintenance-photos";
const CATEGORIES = ["Plumbing", "Electrical", "Appliance", "Heating/Cooling", "General", "Other"];

interface LoadedProperty {
  address: string | null;
  weekly_rent: number | null;
  rent_due_day: string | null;
}
interface Contact {
  org: string | null;
  email: string | null;
}
interface Payload {
  tenancy: Tenancy;
  property: LoadedProperty | null;
  contact: Contact | null;
  notices: Notice[];
  resources: PortalResource[];
  payments: Payment[];
  requests: MaintenanceRequest[];
}

const noticeTone: Record<string, "good" | "bad" | "warn" | "neutral"> = {
  rent: "warn",
  bill: "warn",
  maintenance: "neutral",
  info: "neutral",
};
const statusTone: Record<string, "good" | "bad" | "warn" | "neutral"> = {
  open: "warn",
  in_progress: "neutral",
  resolved: "good",
  cancelled: "neutral",
};
const statusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

export default function PortalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [resourceUrls, setResourceUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data: res, error } = await supabase.rpc("portal_get", { p_token: token });
    if (error || !res) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const payload = res as Payload;
    setData(payload);
    setLoading(false);
    const urls: Record<string, string> = {};
    for (const r of payload.resources || []) {
      if (r.path) {
        const { data: pub } = supabase.storage.from(RESOURCE_BUCKET).getPublicUrl(r.path);
        if (pub) urls[r.id] = pub.publicUrl;
      }
    }
    setResourceUrls(urls);
  }, [token]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  if (loading) return <Centered>Loading your portal…</Centered>;
  if (notFound || !data) {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold tracking-tight">Portal not found</h1>
        <p className="mt-2 text-muted">This link is invalid. Please check with your property manager.</p>
      </Centered>
    );
  }

  const { tenancy, property, contact, notices, resources, payments, requests } = data;

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

      {/* Lease & bond */}
      <Card title="Lease & bond">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Lease start" value={fmtDate(tenancy.lease_start)} />
          <Stat label="Lease end" value={fmtDate(tenancy.lease_end)} />
          <Stat label="Move-in" value={fmtDate(tenancy.move_in_date)} />
          <Stat label="Bond" value={fmtMoney(tenancy.bond_amount)} />
          <Stat label="Bond lodged" value={tenancy.bond_lodged ? "Yes" : "Not yet"} />
        </div>
      </Card>

      {/* Maintenance */}
      <MaintenanceCard
        token={token}
        requests={requests}
        onSubmitted={load}
        managerEmail={contact?.email ?? null}
        propertyLabel={property?.address ?? null}
        tenantName={tenancy.tenant_name ?? null}
      />

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
                    <Badge tone={noticeTone[n.category] || "neutral"}>{n.category}</Badge>
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

      {/* Contact */}
      <Card title="Your property manager">
        <div className="text-sm">
          <div className="font-medium">{contact?.org || brand.full}</div>
          {contact?.email && (
            <a href={`mailto:${contact.email}`} className="text-accent hover:underline">
              {contact.email}
            </a>
          )}
          {tenancy.emergency_contact && (
            <div className="mt-2 text-muted">Emergency contact: {tenancy.emergency_contact}</div>
          )}
        </div>
      </Card>

      <p className="mt-8 text-xs text-muted">Powered by {brand.name}.</p>
    </div>
  );
}

function MaintenanceCard({
  token,
  requests,
  onSubmitted,
  managerEmail,
  propertyLabel,
  tenantName,
}: {
  token: string;
  requests: MaintenanceRequest[];
  onSubmitted: () => Promise<void>;
  managerEmail: string | null;
  propertyLabel: string | null;
  tenantName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("General");
  const [urgency, setUrgency] = useState("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | undefined>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    if (!title.trim()) {
      setMsg("Please add a short title.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      let photoPath: string | null = null;
      if (file) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        photoPath = `${token}/${Date.now()}-${safe}`;
        const up = await supabase.storage.from(PHOTO_BUCKET).upload(photoPath, file, { upsert: true });
        if (up.error) throw new Error(up.error.message);
      }
      const { data: res, error } = await supabase.rpc("portal_submit_request", {
        p_token: token,
        p_category: category,
        p_title: title.trim(),
        p_description: description.trim() || null,
        p_urgency: urgency,
        p_photo_path: photoPath,
      });
      if (error) throw new Error(error.message);
      if (res?.error) throw new Error("Couldn't submit — please contact your manager.");

      // Best-effort email alert to the manager (won't block the submission).
      if (managerEmail) {
        fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: managerEmail,
            subject: `New maintenance request${propertyLabel ? ` — ${propertyLabel}` : ""}`,
            body: `${tenantName || "A tenant"} submitted a ${urgency} ${category} request:\n\n${title}\n${description}\n\nOpen the workspace to action it.`,
          }),
        }).catch(() => {});
      }

      setTitle("");
      setDescription("");
      setFile(undefined);
      setCategory("General");
      setUrgency("normal");
      setOpen(false);
      setMsg("Request submitted ✓");
      await onSubmitted();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Maintenance requests">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Report a repair or issue at the property.</p>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80"
        >
          {open ? "Close" : "New request"}
        </button>
      </div>

      {open && (
        <div className="mb-4 rounded-xl border border-border p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <Select label="Urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </Select>
            <Field label="Title" className="sm:col-span-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kitchen tap dripping" />
            <Textarea label="Description" className="sm:col-span-2" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="mt-3">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Photo (optional)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0])}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-medium file:text-background"
            />
          </div>
          <button
            onClick={submit}
            disabled={busy}
            className="mt-3 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit request"}
          </button>
        </div>
      )}

      {msg && <p className="mb-3 text-sm text-muted">{msg}</p>}

      {requests.length === 0 ? (
        <p className="text-sm text-muted">No requests yet.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {r.title} <span className="text-xs text-muted">· {r.category}</span>
                </span>
                <span className="flex items-center gap-2">
                  {r.urgency === "urgent" && <Badge tone="bad">Urgent</Badge>}
                  <Badge tone={statusTone[r.status] || "neutral"}>{statusLabel[r.status] || r.status}</Badge>
                </span>
              </div>
              {r.description && <p className="mt-1 text-sm text-muted">{r.description}</p>}
              <p className="mt-1 text-xs text-muted">Submitted {fmtDate(r.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
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
