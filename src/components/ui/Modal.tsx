"use client";

import { useEffect, type ReactNode } from "react";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5"
      onClick={onClose}
    >
      <div
        className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-5 text-xl font-semibold tracking-tight">{title}</h3>
        {children}
      </div>
    </div>
  );
}
