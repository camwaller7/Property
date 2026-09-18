import type { ReactNode } from "react";

type Tone = "good" | "bad" | "warn" | "neutral";

const toneClasses: Record<Tone, string> = {
  good: "bg-good-surface text-good",
  bad: "bg-bad-surface text-bad",
  warn: "bg-warn-surface text-warn",
  neutral: "bg-surface text-muted",
};

export default function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
