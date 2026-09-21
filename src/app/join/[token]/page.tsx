"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";

type Phase =
  | { s: "loading" }
  | { s: "need_auth" }
  | { s: "joined"; org: string }
  | { s: "error"; message: string };

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [phase, setPhase] = useState<Phase>({ s: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session) {
        setPhase({ s: "need_auth" });
        return;
      }
      const { data: result, error } = await supabase.rpc("accept_invite", { p_token: token });
      if (!active) return;
      if (error || !result || result.error) {
        setPhase({ s: "error", message: "This invite link is invalid or has expired." });
        return;
      }
      setPhase({ s: "joined", org: result.org ?? "the workspace" });
    })();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
        {phase.s === "loading" && <p className="mt-3 text-sm text-muted">Checking your invite…</p>}
        {phase.s === "need_auth" && (
          <>
            <p className="mt-3 text-sm text-muted">
              Sign in or create your account first, then reopen this invite link to join the team.
            </p>
            <Link
              href="/app"
              className="mt-5 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-80"
            >
              Go to sign in
            </Link>
          </>
        )}
        {phase.s === "joined" && (
          <>
            <p className="mt-3 text-sm text-muted">
              You&apos;ve joined <strong>{phase.org}</strong>.
            </p>
            <Link
              href="/app"
              className="mt-5 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-80"
            >
              Open the workspace
            </Link>
          </>
        )}
        {phase.s === "error" && <p className="mt-3 text-sm text-bad">{phase.message}</p>}
      </div>
    </div>
  );
}
