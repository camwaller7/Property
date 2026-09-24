"use client";

import { useMemo, useState } from "react";
import { INSPECTION_CHECKLIST } from "@/lib/inspectionChecklist";

// Renders the standard inspection-prep checklist. Self-contained (no data/props
// required) so it works identically in the public tenant portal and the
// authenticated landlord workspace. Ticking is local-only (a helper for the
// tenant while they work through it) — it is not persisted anywhere.
export default function InspectionChecklist({ interactive = true }: { interactive?: boolean }) {
  const [done, setDone] = useState<Set<string>>(new Set());

  const total = useMemo(
    () => INSPECTION_CHECKLIST.reduce((n, s) => n + s.items.length, 0),
    []
  );

  function toggle(key: string) {
    if (!interactive) return;
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      {interactive && (
        <div className="mb-4 flex items-center justify-between text-xs text-muted">
          <span>Tick items as you go — this is just to help you, nothing is submitted.</span>
          <span className="font-medium tabular">{done.size}/{total}</span>
        </div>
      )}
      <div className="space-y-5">
        {INSPECTION_CHECKLIST.map((section, si) => (
          <div key={section.title}>
            <h3 className="mb-2 text-sm font-semibold tracking-tight">{section.title}</h3>
            <ul className="space-y-1.5">
              {section.items.map((item, ii) => {
                const key = `${si}:${ii}`;
                const checked = done.has(key);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      disabled={!interactive}
                      className={`flex w-full items-start gap-2 text-left text-sm ${
                        interactive ? "hover:text-foreground" : "cursor-default"
                      } ${checked ? "text-muted line-through" : ""}`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                          checked ? "border-good bg-good text-background" : "border-border"
                        }`}
                        aria-hidden
                      >
                        {checked ? "✓" : ""}
                      </span>
                      <span>{item}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
