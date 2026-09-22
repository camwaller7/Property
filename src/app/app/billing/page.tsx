"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { usePortfolio } from "@/lib/portfolio";
import { supabase } from "@/lib/supabase";
import { PLANS, activePlan, isPaid, type PlanKey } from "@/lib/plans";
import { fmtDate } from "@/lib/format";

const RANK: Record<PlanKey, number> = { free: 0, plus: 1, pro: 2 };
type Cycle = "monthly" | "annual";

export default function BillingPage() {
  const { org, myRole, properties, loading, setRentOnlineEnabled } = usePortfolio();
  const [busy, setBusy] = useState<PlanKey | null>(null);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [error, setError] = useState("");
  const [rentBusy, setRentBusy] = useState(false);
  const [connectBusy, setConnectBusy] = useState(false);

  async function connectStripe() {
    setConnectBusy(true);
    setError("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/connect/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
        },
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || "Couldn't start Stripe onboarding.");
      else if (json.url) window.location.assign(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start Stripe onboarding.");
    } finally {
      setConnectBusy(false);
    }
  }

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!org) return <p className="text-muted">No organization found.</p>;

  const current = activePlan(org.plan, org.subscription_status);
  const paid = isPaid(org.plan, org.subscription_status);
  const isAdmin = myRole === "owner" || myRole === "admin";

  async function upgrade(plan: PlanKey) {
    setBusy(plan);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: org!.id, plan, cycle }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Couldn't start checkout.");
      else if (data.url) window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout.");
    } finally {
      setBusy(null);
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
          <Badge tone={paid ? "good" : "neutral"}>
            {paid ? org.subscription_status || "active" : "free"}
          </Badge>
        </div>
      </section>

      {/* Billing cycle toggle */}
      <div className="mb-5 flex items-center justify-center gap-2">
        <div className="inline-flex rounded-full border border-border p-1 text-sm">
          <button
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              cycle === "monthly" ? "bg-foreground text-background" : "text-muted hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("annual")}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              cycle === "annual" ? "bg-foreground text-background" : "text-muted hover:text-foreground"
            }`}
          >
            Annual <span className="text-xs opacity-70">· 2 months free</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {Object.values(PLANS).map((p) => {
          const isCurrent = p.key === current.key;
          const canUpgrade = RANK[p.key] > RANK[current.key];
          return (
            <div
              key={p.key}
              className={`relative rounded-2xl border p-6 ${
                isCurrent ? "border-accent" : p.highlight ? "border-accent/50" : "border-border"
              }`}
            >
              {p.highlight && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-background">
                  Most popular
                </span>
              )}
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <span className="text-lg font-semibold">
                  {cycle === "annual" ? p.priceAnnualLabel : p.priceLabel}
                </span>
              </div>
              {p.key !== "free" && (
                <div className="mt-1 text-right text-xs text-muted">
                  {cycle === "annual" ? "billed yearly" : p.priceNote}
                </div>
              )}
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {p.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              {canUpgrade && (
                <button
                  onClick={() => upgrade(p.key)}
                  disabled={busy !== null || !isAdmin}
                  className="mt-6 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  {busy === p.key
                    ? "Starting…"
                    : isAdmin
                      ? `Upgrade to ${p.name}`
                      : "Ask an admin to upgrade"}
                </button>
              )}
              {isCurrent && (
                <p className="mt-6 text-center text-sm text-muted">Your current plan</p>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-bad">{error}</p>}

      {/* Online rent collection */}
      <section className="mt-8 rounded-2xl border border-border p-5">
        <h2 className="text-lg font-semibold tracking-tight">Rent payments</h2>
        <p className="mt-1 text-sm text-muted">
          Let tenants pay rent from their portal via Stripe. When a payment succeeds, the matching
          ledger entry is marked paid automatically.
        </p>
        {/* Stripe Connect: the landlord's own payout account */}
        <div className="mt-4 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">Your payout account (Stripe)</div>
              <div className="text-xs text-muted">Rent is paid directly into your own Stripe account.</div>
            </div>
            {org.stripe_charges_enabled ? (
              <Badge tone="good">Connected</Badge>
            ) : org.stripe_account_id ? (
              <Badge tone="warn">Setup incomplete</Badge>
            ) : (
              <Badge tone="neutral">Not connected</Badge>
            )}
          </div>
          {!org.stripe_charges_enabled && (
            <button
              onClick={connectStripe}
              disabled={connectBusy || !isAdmin}
              className="mt-3 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
            >
              {connectBusy
                ? "Opening Stripe…"
                : org.stripe_account_id
                  ? "Finish Stripe setup"
                  : "Connect Stripe"}
            </button>
          )}
        </div>

        <label className="mt-4 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={!!org.rent_online_enabled}
            disabled={rentBusy || !isAdmin || !org.stripe_charges_enabled}
            onChange={async (e) => {
              setRentBusy(true);
              await setRentOnlineEnabled(e.target.checked);
              setRentBusy(false);
            }}
          />
          Accept rent payments online
        </label>
        <p className="mt-2 text-xs text-muted">
          Connect your Stripe account first. Tenants then pay from their portal and the rent lands in
          your account; the matching ledger entry is marked paid automatically. Requires the app&apos;s
          Stripe keys (see docs/SETUP.md).
        </p>
      </section>

      <p className="mt-6 text-xs text-muted">
        Payments are handled securely by Stripe. Billing activates once Stripe keys are configured
        (see docs/SETUP.md).
      </p>
    </div>
  );
}
