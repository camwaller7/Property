"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import { usePortfolio } from "@/lib/portfolio";
import { fmtDate } from "@/lib/format";
import { collectEvents, EVENT_META, iso, type CalEvent } from "@/lib/calendar";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PropertyCalendar() {
  const { properties, paymentsByProperty, tenancies, inspections, notices, maintenance, propertyBills } = usePortfolio();
  const [propFilter, setPropFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const events = useMemo(
    () => collectEvents({ properties, paymentsByProperty, tenancies, inspections, notices, maintenance, bills: propertyBills }),
    [properties, paymentsByProperty, tenancies, inspections, notices, maintenance, propertyBills]
  );
  const filtered = propFilter ? events.filter((e) => e.propertyId === propFilter) : events;

  // Group by date.
  const byDate = useMemo(() => {
    const m: Record<string, CalEvent[]> = {};
    for (const e of filtered) (m[e.date] ||= []).push(e);
    return m;
  }, [filtered]);

  // Build the month grid (weeks starting Monday).
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayIso = iso(new Date());
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Two-week snapshot: everything due from today through the next 14 days.
  const in14 = new Date();
  in14.setDate(in14.getDate() + 14);
  const twoWeeks = iso(in14);
  const upcoming = filtered.filter((e) => e.date >= todayIso && e.date <= twoWeeks);

  function propLabel(id: string | null) {
    return properties.find((p) => p.id === id)?.address || "—";
  }

  return (
    <section className="mb-8 rounded-2xl border border-border p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Calendar</h2>
        <select
          value={propFilter}
          onChange={(e) => setPropFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
        >
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.address || "(no address)"}</option>
          ))}
        </select>
      </div>

      {/* Month grid */}
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-surface">←</button>
        <div className="text-sm font-medium">{monthLabel}</div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-surface">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = iso(d);
          const dayEvents = byDate[key] || [];
          const isToday = key === todayIso;
          const isSelected = key === selected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected((s) => (s === key ? null : key))}
              className={`min-h-[52px] rounded-lg border p-1 text-left transition-colors hover:bg-surface ${
                isSelected ? "border-accent ring-1 ring-accent" : isToday ? "border-accent" : "border-border"
              }`}
              title={dayEvents.map((e) => e.label).join("\n")}
            >
              <div className="text-[11px] text-muted">{d.getDate()}</div>
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {dayEvents.slice(0, 4).map((e, j) => (
                  <span key={j} className={`h-1.5 w-1.5 rounded-full ${dotClass(e.type)}`} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day — what's due that day */}
      {selected && (
        <div className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">{fmtDate(selected)}</div>
            <button onClick={() => setSelected(null)} className="text-xs text-muted hover:underline">Clear</button>
          </div>
          {(byDate[selected] || []).length === 0 ? (
            <p className="text-sm text-muted">Nothing due on this day.</p>
          ) : (
            <ul className="space-y-1.5">
              {(byDate[selected] || []).map((e, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Badge tone={EVENT_META[e.type].tone}>{EVENT_META[e.type].label}</Badge>
                    {e.label}
                  </span>
                  {!propFilter && <span className="text-xs text-muted">{propLabel(e.propertyId)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Next two weeks */}
      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Next 2 weeks</div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">Nothing due in the next two weeks.</p>
        ) : (
          <ul className="space-y-1.5">
            {upcoming.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <Badge tone={EVENT_META[e.type].tone}>{EVENT_META[e.type].label}</Badge>
                  {e.label}
                  {!propFilter && <span className="text-xs text-muted">· {propLabel(e.propertyId)}</span>}
                </span>
                <span className="text-muted">{fmtDate(e.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function dotClass(type: string): string {
  switch (type) {
    case "rent": return "bg-warn";
    case "notice": return "bg-warn";
    case "reminder": return "bg-warn";
    case "bill": return "bg-warn";
    case "task": return "bg-bad";
    case "movein": return "bg-good";
    default: return "bg-accent";
  }
}
