"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fmtDate, fmtMoney } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import type { RentalHistory, RentalHistoryShare } from "@/lib/types";

// Shown to a signed-in tenant on their portal: their portable rental history
// across every manager, and the sharing requests from new property managers
// they can approve / decline / revoke. Renders nothing for token-only viewers
// (no auth session), so the public token portal is unaffected.
export default function RentalHistoryPanel() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [history, setHistory] = useState<RentalHistory[]>([]);
  const [shares, setShares] = useState<RentalHistoryShare[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setAuthed(false);
      setReady(true);
      return;
    }
    setAuthed(true);
    const [{ data: hist }, { data: sh }] = await Promise.all([
      supabase.from("rental_history").select("*").order("ended_on", { ascending: false }),
      supabase.rpc("my_rental_history_shares"),
    ]);
    setHistory((hist as RentalHistory[]) || []);
    setShares(((sh as RentalHistoryShare[] | null) || []));
    setReady(true);
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

  async function respond(id: string, approve: boolean) {
    setBusyId(id);
    await supabase.rpc("respond_rental_history_share", { p_share_id: id, p_approve: approve });
    await load();
    setBusyId(null);
  }

  async function revoke(id: string) {
    if (!globalThis.confirm?.("Revoke this manager's access to your rental history?")) return;
    setBusyId(id);
    await supabase.rpc("revoke_rental_history_share", { p_share_id: id });
    await load();
    setBusyId(null);
  }

  if (!ready || !authed) return null;

  const pending = shares.filter((s) => s.status === "pending");
  const approved = shares.filter((s) => s.status === "approved");

  return (
    <>
      {pending.length > 0 && (
        <section className="mb-6 rounded-2xl border border-warn/40 bg-warn/5 p-5">
          <h2 className="mb-1 text-lg font-semibold tracking-tight">Rental history requests</h2>
          <p className="mb-4 text-sm text-muted">
            A property manager has asked to view your rental history. They only get read-only access to
            your past-tenancy records, and only if you approve. You can revoke access anytime.
          </p>
          <ul className="space-y-3">
            {pending.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
                <div className="text-sm">
                  <div className="font-medium">{s.org_name || "A property manager"}</div>
                  <div className="text-xs text-muted">Requested {fmtDate(s.created_at?.slice(0, 10))}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => respond(s.id, true)}
                    disabled={busyId === s.id}
                    className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:opacity-80 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => respond(s.id, false)}
                    disabled={busyId === s.id}
                    className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-surface disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6 rounded-2xl border border-border p-5">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Your rental history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">
            No past tenancies yet. When a tenancy ends, it&apos;s saved here as a portable record you can
            share with future property managers.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{h.property_address || "Property"}</div>
                    <div className="text-xs text-muted">
                      {fmtDate(h.lease_start)} → {fmtDate(h.lease_end)}
                      {h.ended_on ? ` · ended ${fmtDate(h.ended_on)}` : ""}
                    </div>
                  </div>
                  {h.weekly_rent != null && (
                    <Badge tone="neutral">{fmtMoney(h.weekly_rent)}/wk</Badge>
                  )}
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

        {approved.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Shared with
            </div>
            <ul className="space-y-2">
              {approved.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {s.org_name || "A property manager"}
                    <span className="ml-2 text-xs text-muted">
                      approved {fmtDate(s.responded_at?.slice(0, 10))}
                    </span>
                  </span>
                  <button
                    onClick={() => revoke(s.id)}
                    disabled={busyId === s.id}
                    className="text-xs font-medium text-bad hover:underline disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
