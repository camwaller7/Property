"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { usePortfolio } from "@/lib/portfolio";
import { fmtDate } from "@/lib/format";
import type { MaintenanceRequest, MaintenanceStatus } from "@/lib/types";

const PHOTO_BUCKET = "maintenance-photos";
const STATUSES: { label: string; value: MaintenanceStatus }[] = [
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Resolved", value: "resolved" },
  { label: "Cancelled", value: "cancelled" },
];
const tone: Record<string, "good" | "bad" | "warn" | "neutral"> = {
  open: "warn",
  in_progress: "neutral",
  scheduled: "neutral",
  resolved: "good",
  cancelled: "neutral",
};

export default function MaintenanceManager() {
  const { maintenance } = usePortfolio();
  if (maintenance.length === 0) return null;
  const open = maintenance.filter((m) => m.status === "open" || m.status === "in_progress");

  return (
    <section className="mb-8 rounded-2xl border border-border p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Requests & communication</h2>
        <Badge tone={open.length > 0 ? "warn" : "good"}>{open.length} open</Badge>
      </div>
      <ul className="space-y-3">
        {maintenance.map((m) => (
          <MatterRow key={m.id} matter={m} />
        ))}
      </ul>
    </section>
  );
}

function MatterRow({ matter }: { matter: MaintenanceRequest }) {
  const { properties, tenancies, updateRequestStatus, addMatterMessage } = usePortfolio();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const prop = properties.find((p) => p.id === matter.property_id);
  const ten = tenancies.find((t) => t.id === matter.tenancy_id);
  const messages = matter.messages || [];

  async function openPhoto(path: string) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
    if (data) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    setErr("");
    const res = await addMatterMessage(matter.id, reply);
    setBusy(false);
    if (res.error) setErr(res.error);
    else setReply("");
  }

  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => setOpen((o) => !o)} className="text-left text-sm font-medium">
          {matter.title} <span className="text-xs capitalize text-muted">· {matter.kind} · {matter.category}</span>
        </button>
        <span className="flex items-center gap-2">
          {matter.urgency === "urgent" && <Badge tone="bad">Urgent</Badge>}
          <Badge tone={tone[matter.status] || "neutral"}>{matter.status.replace("_", " ")}</Badge>
        </span>
      </div>
      <div className="mt-1 text-xs text-muted">
        {prop?.address || "—"}
        {ten?.tenant_name ? ` · ${ten.tenant_name}` : ""} · {fmtDate(matter.created_at)}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={matter.status}
          onChange={(e) => updateRequestStatus(matter.id, e.target.value as MaintenanceStatus)}
          className="rounded-lg border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {matter.photo_path && (
          <button onClick={() => openPhoto(matter.photo_path!)} className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface">
            View photo
          </button>
        )}
        <button onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-accent hover:underline">
          {open ? "Hide thread" : `Thread (${messages.length})`}
        </button>
      </div>

      {open && (
        <div className="mt-3 border-t border-border pt-3">
          <ul className="space-y-2">
            {messages.length === 0 && <li className="text-xs text-muted">No messages yet.</li>}
            {messages.map((msg, i) => (
              <li key={i} className={`text-sm ${msg.author === "manager" ? "text-right" : ""}`}>
                <div
                  className={`inline-block max-w-[85%] rounded-xl px-3 py-2 ${
                    msg.author === "manager" ? "bg-accent/10" : "bg-surface"
                  }`}
                >
                  {msg.status_change ? (
                    <span className="text-xs text-muted">
                      Status changed to <strong>{msg.status_change.replace("_", " ")}</strong>
                    </span>
                  ) : (
                    <span>{msg.body}</span>
                  )}
                  <div className="mt-0.5 text-[11px] text-muted">
                    {msg.author === "manager" ? "You" : ten?.tenant_name || "Tenant"} · {fmtDate(msg.created_at)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Reply to the tenant…"
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={send}
              disabled={busy}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
            >
              {busy ? "…" : "Send"}
            </button>
          </div>
          {err && <p className="mt-1 text-sm text-bad">{err}</p>}
        </div>
      )}
    </li>
  );
}
