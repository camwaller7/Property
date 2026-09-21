"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";

// Reached from a password-reset email link. The link established a session
// (detectSessionInUrl), so the user just sets a new password here.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setReady(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function save() {
    if (password.length < 8) {
      setErr("Choose a password of at least 8 characters.");
      return;
    }
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace("/app"), 1200);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
        <p className="mt-2 text-sm text-muted">Set a new password</p>

        {done ? (
          <p className="mt-5 text-sm text-good">Password updated ✓ Taking you in…</p>
        ) : !ready ? (
          <p className="mt-5 text-sm text-muted">Verifying your reset link…</p>
        ) : (
          <>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="New password (8+ characters)"
              className="mt-5 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
            />
            <button
              onClick={save}
              disabled={busy}
              className="mt-4 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Update password"}
            </button>
            <p className="mt-2 min-h-[18px] text-sm text-bad">{err}</p>
          </>
        )}
      </div>
    </div>
  );
}
