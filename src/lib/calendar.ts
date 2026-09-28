// Aggregates upcoming property events from the workspace data into a single
// calendar feed. Pure function so it's easy to reason about and reuse.

import type { Inspection, MaintenanceRequest, Notice, Payment, Property, PropertyBill, ComplianceItem, Tenancy } from "./types";
import { fmtMoney } from "./format";
import { REMINDER_DAYS, minusDays } from "./inspections";
import { BILL_KIND_LABEL, projectBillDates } from "./bills";
import { COMPLIANCE_KIND_LABEL } from "./compliance";

export type CalEventType = "rent" | "inspection" | "lease" | "movein" | "notice" | "task" | "reminder" | "bill" | "compliance";

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
  bill: { label: "Bill", tone: "warn" },
  compliance: { label: "Compliance", tone: "bad" },
};

export function collectEvents(args: {
  properties: Property[];
  paymentsByProperty: Record<string, Payment[]>;
  tenancies: Tenancy[];
  inspections: Inspection[];
  notices: Notice[];
  maintenance: MaintenanceRequest[];
  bills?: PropertyBill[];
  compliance?: ComplianceItem[];
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

  // Recurring property bills (council rates, water…) projected forward.
  for (const b of args.bills ?? []) {
    if (!b.active) continue;
    const name = b.label || BILL_KIND_LABEL[b.kind] || "Bill";
    const amount = b.amount != null ? ` ${fmtMoney(b.amount)}` : "";
    const who = b.payer === "tenant" ? " (recover from tenant)" : "";
    for (const date of projectBillDates(b.next_due, b.frequency)) {
      events.push({ date, type: "bill", label: `${name}${amount} due${who}`, propertyId: b.property_id });
    }
  }

  // Compliance & safety checks — project the next due date forward on its
  // cadence so upcoming (and overdue) checks surface in the calendar.
  for (const c of args.compliance ?? []) {
    if (!c.active || !c.next_due) continue;
    const name = c.label || COMPLIANCE_KIND_LABEL[c.kind] || "Compliance check";
    for (const date of projectBillDatesEveryMonths(c.next_due, c.interval_months)) {
      events.push({ date, type: "compliance", label: `${name} due`, propertyId: c.property_id });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

// Project a date forward every `months` over the next 12 months (compliance
// cadences are in months rather than the bill frequency enum).
function projectBillDatesEveryMonths(anchor: string, months: number): string[] {
  const start = new Date(anchor + "T00:00:00");
  if (Number.isNaN(start.getTime())) return [];
  const step = Math.max(1, months || 12);
  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + 12);
  const dates: string[] = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i * step);
    if (d.getTime() > horizon.getTime()) break;
    dates.push(iso(d));
  }
  return dates;
}

export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
