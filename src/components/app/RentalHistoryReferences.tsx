"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fmtDate, fmtMoney } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import { Field } from "@/components/app/Field";
import type { RentalHistory } from "@/lib/types";

interface SharedHistory {
  share_id: string;
  tenant_email: string | null;
  approved_at: string | null;
  history: RentalHistory[];
}

// Manager tool: request a prospective tenant's portable rental history by email
// (they approve in their own portal), then read the histories tenants have
// shared with this org. Cross-org access exists only with the tenant's consent.
export default function RentalHistoryReferences() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [shared, setShared] = useState<SharedHistory[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("shared_rental_histories");
    setShared(((data as SharedHistory[] | null) || []));
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  async function request() {
    setErr("");
    setMsg("");
    if (!email.trim()) {
      setErr("Enter the tenant's email.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("request_rental_history", { p_tenant_email: email.trim() });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    const res = (data ?? {}) as { error?: string; status?: string };
    if (res.error) {
      const messages: Record<string, string> = {
        not_a_manager: "Only a manager account can request history.",
        tenant_not_found: "No Corvelle tenant account was found for that email. They need a tenant portal account first.",
      };
      setErr(messages[res.error] ?? res.error);
      return;
    }
    if (res.status === "approved") {
      setMsg("This tenant has already approved your access — see their history below.");
      await load();
    } else {
      setMsg("Request sent. The tenant will see it in their portal and can approve access.");
    }
    setEmail("");
  }

  async function revoke(shareId: string) {
    if (!globalThis.confirm?.("Remove your access to this tenant's shared history?")) return;
    await supabase.rpc("revoke_rental_history_share", { p_share_id: shareId });
    await load();
  }

  return (
    <div>
      <section className="mb-6 rounded-2xl border border-border p-5">
        <h2 className="text-lg font-semibold tracking-tight">Request a rental history reference</h2>
        <p className="mt-1 text-sm text-muted">
          Ask a prospective tenant (who has a Corvelle portal account) to share their rental history.
          They approve it in their own portal — you never see anything without their consent.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field
            label="Tenant email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tenant@email.com"
            className="min-w-[240px] flex-1"
          />
          <button
            onClick={request}
            disabled={busy}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Request history"}
          </button>
        </div>
        {msg && <p className="mt-3 text-sm text-good">{msg}</p>}
        {err && <p className="mt-3 text-sm text-bad">{err}</p>}
      </section>

      <section className="rounded-2xl border border-border p-5">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Shared with you</h2>
        {shared.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No tenants have shared their history with you yet. Approved requests appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {shared.map((s) => (
              <li key={s.share_id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium">{s.tenant_email || "Tenant"}</span>
                    {s.approved_at && (
                      <span className="ml-2 text-xs text-muted">shared {fmtDate(s.approved_at.slice(0, 10))}</span>
                    )}
                  </div>
                  <button
                    onClick={() => revoke(s.share_id)}
                    className="text-xs font-medium text-muted hover:text-bad"
                  >
                    Remove access
                  </button>
                </div>
                {s.history.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No past tenancies on record yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {s.history.map((h) => (
                      <li key={h.id} className="rounded-lg border border-border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-medium">{h.property_address || "Property"}</div>
                            <div className="text-xs text-muted">
                              {fmtDate(h.lease_start)} → {fmtDate(h.lease_end)}
                              {h.ended_on ? ` · ended ${fmtDate(h.ended_on)}` : ""}
                            </div>
                          </div>
                          {h.weekly_rent != null && <Badge tone="neutral">{fmtMoney(h.weekly_rent)}/wk</Badge>}
                        </div>
                        {h.conduct_note && (
                          <p className="mt-2 text-sm text-muted">
                            <span className="font-medium text-foreground">Reference:</span> {h.conduct_note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
