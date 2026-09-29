"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { brand } from "@/lib/brand";

// Public unsubscribe confirmation page. Reads the signed link (?e=&t=) and, on
// an explicit click, POSTs to /api/unsubscribe to record the opt-out. The click
// step matters: mail clients prefetch links, so a bare GET must never opt
// someone out — the recording only happens on a real confirmation.
function UnsubscribeInner() {
  const params = useSearchParams();
  const email = params.get("e") ?? "";
  const token = params.get("t") ?? "";

  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const invalid = !email || !token;

  async function confirm() {
    setState("busy");
    setError("");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      if (res.ok) {
        setState("done");
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-border p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Unsubscribe</h1>

        {invalid ? (
          <p className="mt-3 text-sm text-muted">
            This unsubscribe link is incomplete or invalid. If you keep receiving reminder emails you
            didn&apos;t expect, reply to any of them and we&apos;ll remove you.
          </p>
        ) : state === "done" ? (
          <p className="mt-3 text-sm text-good">
            Done — <strong>{email}</strong> won&apos;t receive reminder emails from {brand.full} any
            more. Important messages about a live tenancy (rent, notices) may still be sent.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted">
              Stop sending reminder emails to <strong>{email}</strong> from {brand.full}?
            </p>
            <button
              onClick={confirm}
              disabled={state === "busy"}
              className="mt-4 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
            >
              {state === "busy" ? "Working…" : "Unsubscribe"}
            </button>
            {state === "error" && <p className="mt-3 text-sm text-bad">{error}</p>}
          </>
        )}

        <p className="mt-6 border-t border-border pt-4 text-xs text-muted">
          <Link href="/" className="hover:underline">
            {brand.full}
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md px-4 py-16 text-sm text-muted">Loading…</main>}>
      <UnsubscribeInner />
    </Suspense>
  );
}
