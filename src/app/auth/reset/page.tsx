"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";
import { PASSWORD_HINT, passwordProblem } from "@/lib/password";

// Reached from a password-reset email link. The link establishes a temporary
// recovery session (detectSessionInUrl / PASSWORD_RECOVERY). The user MUST set a
// new password here; we then sign them out and send them to the login so they
// have to sign in with the new password — never dropped straight into the app.
export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // When set, the password was changed and this is the login path to sign in at.
  const [doneLogin, setDoneLogin] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady(true);
    });
    // PASSWORD_RECOVERY fires when the recovery link is processed.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function save() {
    const problem = passwordProblem(password);
    if (problem) return setErr(problem);
    if (password !== confirm) return setErr("The two passwords don't match.");
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setBusy(false);
      return setErr(error.message);
    }
    // Work out which login to send them to (tenant vs manager) before we drop
    // the session, then sign out so the new password is required to get back in.
    let loginPath = "/app";
    try {
      const { data } = await supabase.rpc("tenant_portal_token");
      if (data) loginPath = "/tenant";
    } catch {
      /* default to manager login */
    }
    await supabase.auth.signOut();
    setBusy(false);
    setDoneLogin(loginPath);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
        <p className="mt-2 text-sm text-muted">Set a new password</p>

        {doneLogin ? (
          <>
            <p className="mt-5 text-sm text-good">Password updated ✓</p>
            <p className="mt-1 text-sm text-muted">Please sign in with your new password.</p>
            <Link
              href={doneLogin}
              className="mt-5 inline-block w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-80"
            >
              Go to sign in
            </Link>
          </>
        ) : !ready ? (
          <p className="mt-5 text-sm text-muted">Verifying your reset link…</p>
        ) : (
          <>
            <input
              type="password"
              name="new-password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="mt-5 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
            />
            <input
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Confirm new password"
              className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
            />
            <p className="mt-2 text-xs text-muted">{PASSWORD_HINT}</p>
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
