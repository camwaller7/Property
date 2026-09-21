"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { usePortfolio } from "@/lib/portfolio";
import { PLANS, planFor, isPro } from "@/lib/plans";
import { fmtDate } from "@/lib/format";

export default function BillingPage() {
  const { org, myRole, properties, loading, setRentOnlineEnabled } = usePortfolio();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rentBusy, setRentBusy] = useState(false);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!org) return <p className="text-muted">No organization found.</p>;

  const pro = isPro(org.plan, org.subscription_status);
  const current = planFor(org.plan);
  const isAdmin = myRole === "owner" || myRole === "admin";

  async function upgrade() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: org!.id }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Couldn't start checkout.");
      else if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-muted">Your plan for {org.name}.</p>
      </header>

      <section className="mb-8 rounded-2xl border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Current plan</div>
            <div className="mt-1 text-2xl font-semibold">{current.name}</div>
            <div className="mt-1 text-sm text-muted">
              {properties.length}
              {current.propertyLimit != null ? ` / ${current.propertyLimit}` : ""} properties
              {org.current_period_end ? ` · renews ${fmtDate(org.current_period_end)}` : ""}
            </div>
          </div>
          <Badge tone={pro ? "good" : "neutral"}>
            {pro ? org.subscription_status || "active" : "free"}
          </Badge>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {Object.values(PLANS).map((p) => (
          <div
            key={p.key}
            className={`rounded-2xl border p-6 ${
              p.key === current.key ? "border-accent" : "border-border"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <span className="text-lg font-semibold">{p.priceLabel}</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {p.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            {p.key === "pro" && !pro && (
              <button
                onClick={upgrade}
                disabled={busy || !isAdmin}
                className="mt-6 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {busy ? "Starting…" : isAdmin ? "Upgrade to Pro" : "Ask an admin to upgrade"}
              </button>
            )}
            {p.key === current.key && (
              <p className="mt-6 text-center text-sm text-muted">Your current plan</p>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-bad">{error}</p>}

      {/* Online rent collection */}
      <section className="mt-8 rounded-2xl border border-border p-5">
        <h2 className="text-lg font-semibold tracking-tight">Rent payments</h2>
        <p className="mt-1 text-sm text-muted">
          Let tenants pay rent from their portal via Stripe. When a payment succeeds, the matching
          ledger entry is marked paid automatically.
        </p>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={!!org.rent_online_enabled}
            disabled={rentBusy || !isAdmin}
            onChange={async (e) => {
              setRentBusy(true);
              await setRentOnlineEnabled(e.target.checked);
              setRentBusy(false);
            }}
          />
          Accept rent payments online
        </label>
        <p className="mt-2 text-xs text-muted">
          Requires Stripe keys configured for the app (see docs/SETUP.md). Rent is received into the
          platform Stripe account; per-landlord payouts (Stripe Connect) are future work.
        </p>
      </section>

      <p className="mt-6 text-xs text-muted">
        Payments are handled securely by Stripe. Billing activates once Stripe keys are configured
        (see docs/SETUP.md).
      </p>
    </div>
  );
}
