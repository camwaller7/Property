import type { ReactNode } from "react";

type Tone = "good" | "bad" | "default";

const valueTone: Record<Tone, string> = {
  good: "text-good",
  bad: "text-bad",
  default: "text-foreground",
};

export default function StatCard({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular ${valueTone[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
