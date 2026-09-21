"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { usePortfolio } from "@/lib/portfolio";
import { fmtDate } from "@/lib/format";
import type { MaintenanceStatus } from "@/lib/types";

const PHOTO_BUCKET = "maintenance-photos";
const NEXT: { label: string; value: MaintenanceStatus }[] = [
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Cancelled", value: "cancelled" },
];
const tone: Record<string, "good" | "bad" | "warn" | "neutral"> = {
  open: "warn",
  in_progress: "neutral",
  resolved: "good",
  cancelled: "neutral",
};

export default function MaintenanceManager() {
  const { maintenance, properties, tenancies, updateRequestStatus } = usePortfolio();
  const [photoErr, setPhotoErr] = useState("");

  if (maintenance.length === 0) return null;

  const open = maintenance.filter((m) => m.status === "open" || m.status === "in_progress");

  async function openPhoto(path: string) {
    setPhotoErr("");
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
    if (error || !data) {
      setPhotoErr("Couldn't open photo.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="mb-8 rounded-2xl border border-border p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Maintenance requests</h2>
        <Badge tone={open.length > 0 ? "warn" : "good"}>{open.length} open</Badge>
      </div>
      <ul className="space-y-2">
        {maintenance.map((m) => {
          const prop = properties.find((p) => p.id === m.property_id);
          const ten = tenancies.find((t) => t.id === m.tenancy_id);
          return (
            <li key={m.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {m.title} <span className="text-xs text-muted">· {m.category}</span>
                </span>
                <span className="flex items-center gap-2">
                  {m.urgency === "urgent" && <Badge tone="bad">Urgent</Badge>}
                  <Badge tone={tone[m.status] || "neutral"}>{m.status.replace("_", " ")}</Badge>
                </span>
              </div>
              <div className="mt-1 text-xs text-muted">
                {prop?.address || "—"}
                {ten?.tenant_name ? ` · ${ten.tenant_name}` : ""} · {fmtDate(m.created_at)}
              </div>
              {m.description && <p className="mt-1 text-sm text-muted">{m.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {m.photo_path && (
                  <button onClick={() => openPhoto(m.photo_path!)} className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface">
                    View photo
                  </button>
                )}
                <select
                  value={m.status}
                  onChange={(e) => updateRequestStatus(m.id, e.target.value as MaintenanceStatus)}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
                >
                  {NEXT.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </li>
          );
        })}
      </ul>
      {photoErr && <p className="mt-2 text-sm text-bad">{photoErr}</p>}
    </section>
  );
}
