import type { PropertyCost } from "./types";

// GST component of a cost. Costs flagged GST-free (rates, water, land tax,
// interest…) contribute nothing. Otherwise use the GST amount captured on the
// invoice; if none was entered, fall back to the AU default of 1/11th of the
// GST-inclusive total.
export function gstComponent(
  c: Pick<PropertyCost, "amount" | "includes_gst" | "gst_amount">
): number {
  if (c.includes_gst === false) return 0;
  if (c.gst_amount != null && c.gst_amount !== undefined) return Number(c.gst_amount) || 0;
  return (Number(c.amount) || 0) / 11;
}

// Australian financial year (1 Jul – 30 Jun) label for a YYYY-MM-DD date.
export function financialYear(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const startYear = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `FY${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}
