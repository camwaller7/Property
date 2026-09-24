// Aggregates upcoming property events from the workspace data into a single
// calendar feed. Pure function so it's easy to reason about and reuse.

import type { Inspection, MaintenanceRequest, Notice, Payment, Property, Tenancy } from "./types";
import { fmtMoney } from "./format";
import { REMINDER_DAYS, minusDays } from "./inspections";

export type CalEventType = "rent" | "inspection" | "lease" | "movein" | "notice" | "task" | "reminder";

export interface CalEvent {
  date: string; // YYYY-MM-DD
  type: CalEventType;
  label: string;
  propertyId: string | null;
}

export const EVENT_META: Record<CalEventType, { label: string; tone: "good" | "bad" | "warn" | "neutral" }> = {
  rent: { label: "Rent", tone: "warn" },
  inspection: { label: "Inspection", tone: "neutral" },
  lease: { label: "Lease", tone: "neutral" },
  movein: { label: "Move-in", tone: "good" },
  notice: { label: "Notice", tone: "warn" },
  task: { label: "Task", tone: "warn" },
  reminder: { label: "Reminder", tone: "warn" },
};

export function collectEvents(args: {
  properties: Property[];
  paymentsByProperty: Record<string, Payment[]>;
  tenancies: Tenancy[];
  inspections: Inspection[];
  notices: Notice[];
  maintenance: MaintenanceRequest[];
}): CalEvent[] {
  const events: CalEvent[] = [];

  // Unpaid rent instalments (due / late).
  for (const list of Object.values(args.paymentsByProperty)) {
    for (const p of list) {
      if (p.due_date && p.status !== "paid") {
        events.push({ date: p.due_date, type: "rent", label: `Rent due ${fmtMoney(p.amount)}`, propertyId: p.property_id });
      }
    }
  }

  // Scheduled inspections, plus reminder markers a month / fortnight / few days
  // ahead (these mirror the automatic reminder emails).
  for (const i of args.inspections) {
    if (i.status === "scheduled" && i.scheduled_date) {
      const kindLabel = i.kind[0].toUpperCase() + i.kind.slice(1);
      events.push({
        date: i.scheduled_date,
        type: "inspection",
        label: `${kindLabel} inspection${i.scheduled_time ? ` ${i.scheduled_time}` : ""}`,
        propertyId: i.property_id,
      });
      for (const days of REMINDER_DAYS) {
        events.push({
          date: minusDays(i.scheduled_date, days),
          type: "reminder",
          label: `${kindLabel} inspection reminder — ${days} days`,
          propertyId: i.property_id,
        });
      }
    }
  }

  // Lease starts / ends and move-ins.
  for (const t of args.tenancies) {
    if (t.lease_start) events.push({ date: t.lease_start, type: "lease", label: `Lease starts${t.tenant_name ? ` · ${t.tenant_name}` : ""}`, propertyId: t.property_id });
    if (t.lease_end) events.push({ date: t.lease_end, type: "lease", label: `Lease ends${t.tenant_name ? ` · ${t.tenant_name}` : ""}`, propertyId: t.property_id });
    if (t.move_in_date) events.push({ date: t.move_in_date, type: "movein", label: `Move-in${t.tenant_name ? ` · ${t.tenant_name}` : ""}`, propertyId: t.property_id });
  }

  // Notices with a due date.
  for (const n of args.notices) {
    if (n.due_date) events.push({ date: n.due_date, type: "notice", label: n.title, propertyId: n.property_id });
  }

  // Open tasks with a due date.
  for (const m of args.maintenance) {
    if (m.due_date && m.status !== "resolved" && m.status !== "cancelled") {
      events.push({ date: m.due_date, type: "task", label: m.title, propertyId: m.property_id });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
