import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";

const control =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";
const labelText = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";

export function Field({
  label,
  className = "",
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className}`}>
      <span className={labelText}>{label}</span>
      <input {...props} className={control} />
    </label>
  );
}

export function Select({
  label,
  className = "",
  children,
  ...props
}: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`block ${className}`}>
      <span className={labelText}>{label}</span>
      <select {...props} className={control}>
        {children}
      </select>
    </label>
  );
}

export function Textarea({
  label,
  className = "",
  ...props
}: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={`block ${className}`}>
      <span className={labelText}>{label}</span>
      <textarea {...props} rows={3} className={`${control} resize-y`} />
    </label>
  );
}
