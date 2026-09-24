"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";
import Badge from "@/components/ui/Badge";
import InspectionChecklist from "@/components/InspectionChecklist";
import { Field, Select, Textarea } from "@/components/app/Field";
import { fmtDate, fmtMoney, nextWeekdayDate, daysUntil } from "@/lib/format";
import { REMINDER_DAYS } from "@/lib/inspections";
import type { Inspection, MaintenanceRequest, Notice, Payment, PortalResource, Tenancy } from "@/lib/types";

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
  org_id?: string | null;
  tenancy: Tenancy;
  property: LoadedProperty | null;
  contact: Contact | null;
  rent_online_enabled?: boolean;
  notices: Notice[];
  resources: PortalResource[];
  payments: Payment[];
  inspections: Inspection[];
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
  scheduled: "neutral",
  resolved: "good",
  cancelled: "neutral",
};
const statusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  scheduled: "Scheduled",
  resolved: "Resolved",
  cancelled: "Cancelled",
};
const KINDS: { value: string; label: string }[] = [
  { value: "maintenance", label: "Maintenance / repair" },
  { value: "enquiry", label: "General enquiry" },
  { value: "complaint", label: "Complaint" },
  { value: "communication", label: "Message" },
];

export default function PortalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [resourceUrls, setResourceUrls] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState<string | null>(null);
  const [payError, setPayError] = useState("");

  async function payNow(paymentId: string) {
    setPaying(paymentId);
    setPayError("");
    try {
      const res = await fetch("/api/rent/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, paymentId }),
      });
      const json = await res.json();
      if (!res.ok) setPayError(json.error || "Couldn't start payment.");
      else if (json.url) window.location.assign(json.url);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Couldn't start payment.");
    } finally {
      setPaying(null);
    }
  }

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
  const upcomingInspections = (data.inspections || [])
    .map((i) => ({ i, d: daysUntil(i.scheduled_date) }))
    .filter((x) => x.d !== null && x.d >= 0)
    .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));

  const outstanding = payments
    .filter((p) => p.status !== "paid" && !p.received_date && p.due_date)
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
  const upcomingPayment = outstanding[0];
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

        {data.rent_online_enabled && outstanding.length > 0 && (
          <div className="mt-4 rounded-xl border border-border p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Pay rent</div>
            <ul className="space-y-2">
              {outstanding.slice(0, 4).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {fmtMoney(p.amount)} <span className="text-xs text-muted">due {fmtDate(p.due_date)}</span>
                    {p.status === "late" && <Badge tone="bad">Late</Badge>}
                  </span>
                  <button
                    onClick={() => payNow(p.id)}
                    disabled={paying === p.id}
                    className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:opacity-80 disabled:opacity-50"
                  >
                    {paying === p.id ? "Starting…" : "Pay now"}
                  </button>
                </li>
              ))}
            </ul>
            {payError && <p className="mt-2 text-sm text-bad">{payError}</p>}
            <p className="mt-2 text-[11px] text-muted">Secure payment via Stripe.</p>
          </div>
        )}

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

      {/* Upcoming inspections */}
      {upcomingInspections.length > 0 && (
        <Card title="Upcoming inspections">
          <ul className="space-y-3">
            {upcomingInspections.map(({ i, d }) => {
              const nextReminder = REMINDER_DAYS.filter((r) => (d ?? 0) >= r).sort((a, b) => a - b)[0];
              return (
                <li key={i.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium capitalize">{i.kind} inspection</span>
                    <span className="text-sm text-muted">
                      {fmtDate(i.scheduled_date)}
                      {i.scheduled_time ? ` at ${i.scheduled_time}` : ""} <Badge tone={d! <= 14 ? "warn" : "neutral"}>{d}d</Badge>
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {nextReminder
                      ? `We'll send a reminder ${nextReminder} days before — and again closer to the day.`
                      : "Reminders have been sent — see you soon."}{" "}
                    There&apos;s a prep checklist below.
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Maintenance */}
      <MaintenanceCard
        token={token}
        orgId={data.org_id ?? null}
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

      {/* Inspection preparation checklist — always available to the tenant */}
      <Card title="Before your inspection">
        <p className="mb-4 text-sm text-muted">
          Here&apos;s everything to have done before a routine inspection. Work through it room by room —
          it&apos;s the same checklist your property manager uses.
        </p>
        <InspectionChecklist />
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
  orgId,
  requests,
  onSubmitted,
  managerEmail,
  propertyLabel,
  tenantName,
}: {
  token: string;
  orgId: string | null;
  requests: MaintenanceRequest[];
  onSubmitted: () => Promise<void>;
  managerEmail: string | null;
  propertyLabel: string | null;
  tenantName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("maintenance");
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
        photoPath = `${orgId ?? "org"}/${token}/${Date.now()}-${safe}`;
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
        p_kind: kind,
      });
      if (error) throw new Error(error.message);
      if (res?.error) throw new Error("Couldn't submit — please contact your manager.");

      if (managerEmail) {
        fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: managerEmail,
            subject: `New ${kind}${propertyLabel ? ` — ${propertyLabel}` : ""}`,
            body: `${tenantName || "A tenant"} submitted a ${urgency} ${category} ${kind}:\n\n${title}\n${description}\n\nOpen the workspace to action it.`,
          }),
        }).catch(() => {});
      }

      setTitle("");
      setDescription("");
      setFile(undefined);
      setKind("maintenance");
      setCategory("General");
      setUrgency("normal");
      setOpen(false);
      setMsg("Submitted ✓");
      await onSubmitted();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const isMaintenance = kind === "maintenance";

  return (
    <Card title="Requests & messages">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Report a repair, ask a question, or message your manager.</p>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80"
        >
          {open ? "Close" : "New"}
        </button>
      </div>

      {open && (
        <div className="mb-4 rounded-xl border border-border p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Type" value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </Select>
            {isMaintenance ? (
              <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            ) : (
              <Select label="Urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </Select>
            )}
            {isMaintenance && (
              <Select label="Urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </Select>
            )}
            <Field label="Title / subject" className="sm:col-span-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kitchen tap dripping" />
            <Textarea label="Details" className="sm:col-span-2" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {isMaintenance && (
            <div className="mt-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Photo (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0])}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-medium file:text-background"
              />
            </div>
          )}
          <button
            onClick={submit}
            disabled={busy}
            className="mt-3 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit"}
          </button>
        </div>
      )}

      {msg && <p className="mb-3 text-sm text-muted">{msg}</p>}

      {requests.length === 0 ? (
        <p className="text-sm text-muted">Nothing yet.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <PortalMatter key={r.id} token={token} matter={r} onChanged={onSubmitted} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function PortalMatter({
  token,
  matter,
  onChanged,
}: {
  token: string;
  matter: MaintenanceRequest;
  onChanged: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const messages = matter.messages || [];

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("portal_add_message", {
      p_token: token,
      p_request_id: matter.id,
      p_body: reply.trim(),
    });
    setBusy(false);
    if (!error) {
      setReply("");
      await onChanged();
    }
  }

  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => setExpanded((e) => !e)} className="text-left text-sm font-medium">
          {matter.title} <span className="text-xs capitalize text-muted">· {matter.kind}</span>
        </button>
        <span className="flex items-center gap-2">
          {matter.urgency === "urgent" && <Badge tone="bad">Urgent</Badge>}
          <Badge tone={statusTone[matter.status] || "neutral"}>{statusLabel[matter.status] || matter.status}</Badge>
        </span>
      </div>
      <button onClick={() => setExpanded((e) => !e)} className="mt-1 text-xs text-accent hover:underline">
        {expanded ? "Hide" : `View thread (${messages.length})`}
      </button>

      {expanded && (
        <div className="mt-2 border-t border-border pt-2">
          <ul className="space-y-2">
            {messages.length === 0 && <li className="text-xs text-muted">No messages yet.</li>}
            {messages.map((m, i) => (
              <li key={i} className={`text-sm ${m.author === "tenant" ? "text-right" : ""}`}>
                <div className={`inline-block max-w-[85%] rounded-xl px-3 py-2 ${m.author === "tenant" ? "bg-accent/10" : "bg-surface"}`}>
                  {m.status_change ? (
                    <span className="text-xs text-muted">
                      Status changed to <strong>{statusLabel[m.status_change] || m.status_change}</strong>
                    </span>
                  ) : (
                    <span>{m.body}</span>
                  )}
                  <div className="mt-0.5 text-[11px] text-muted">
                    {m.author === "tenant" ? "You" : "Manager"} · {fmtDate(m.created_at)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Add a reply…"
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button onClick={send} disabled={busy} className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50">
              {busy ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </li>
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
