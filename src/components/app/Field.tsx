import type { InputHTMLAttributes } from "react";

export function Field({
  label,
  className = "",
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
