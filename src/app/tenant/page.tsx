"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";

// Tenant login. Tenants sign in here (or from the landing page's Tenant login)
// and are taken to their portal. The account was created via the sign-up link
// their manager sent (/tenant/claim/<token>) and linked to their tenancy, so we
// resolve their portal token and open the existing portal.
export default function TenantLoginPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [unlinked, setUnlinked] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Once signed in, resolve the linked tenancy's portal token and open it.
  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("tenant_portal_token");
      if (!active) return;
      if (!error && data) router.replace(`/portal/${data}`);
      else setUnlinked(true);
    })();
    return () => {
      active = false;
    };
  }, [session, router]);

  if (!ready) return <Centered>Loading…</Centered>;

  if (session) {
    if (unlinked) {
      return (
        <Centered>
          <h1 className="text-2xl font-semibold tracking-tight">Account not linked yet</h1>
          <p className="mt-2 text-muted">
            You&apos;re signed in, but this account isn&apos;t linked to a tenancy. Please use the sign-up
            link your property manager sent, or contact them.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 text-sm text-accent hover:underline"
          >
            Sign out
          </button>
        </Centered>
      );
    }
    return <Centered>Opening your portal…</Centered>;
  }

  return <TenantLoginForm />;
}

function TenantLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  function callbackUrl() {
    return `${window.location.origin}/tenant`;
  }

  async function signIn() {
    if (!email || !password) return setErr("Enter your email and password.");
    setBusy(true);
    setErr("");
    setNotice("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
  }

  async function sendMagicLink() {
    if (!email) return setErr("Enter your email first.");
    setBusy(true);
    setErr("");
    setNotice("");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl() } });
    setBusy(false);
    if (error) setErr(error.message);
    else setNotice("Magic link sent — check your email to sign in.");
  }

  async function sendReset() {
    if (!email) return setErr("Enter your email first, then tap reset.");
    setBusy(true);
    setErr("");
    setNotice("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl() });
    setBusy(false);
    if (error) setErr(error.message);
    else setNotice("Password reset email sent — check your inbox.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-center text-2xl font-semibold tracking-tight">{brand.name}</h1>
        <p className="mt-2 text-center text-sm text-muted">Tenant portal sign-in</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            signIn();
          }}
        >
          <input
            type="email"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="mt-5 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
          />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Sign in"}
          </button>
        </form>
        {notice && <p className="mt-3 text-center text-sm text-good">{notice}</p>}
        <p className="mt-2 min-h-[18px] text-center text-sm text-bad">{err}</p>
        <div className="mt-3 flex items-center justify-center gap-4 text-sm">
          <button onClick={sendMagicLink} disabled={busy} className="text-accent hover:underline disabled:opacity-50">
            Email me a magic link
          </button>
          <button onClick={sendReset} disabled={busy} className="text-muted hover:text-foreground disabled:opacity-50">
            Forgot password?
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          New tenant? Use the sign-up link your property manager sent you.{" "}
          <Link href="/" className="text-accent hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}
