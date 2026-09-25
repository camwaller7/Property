"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { brand } from "@/lib/brand";
import { PASSWORD_HINT, passwordProblem } from "@/lib/password";

// Tenant account setup from the link a manager sends (/tenant/claim/<token>).
// Two paths:
//  • Create account — a brand-new signup, tagged { role: 'tenant', portal_token }
//    so the handle_new_user trigger links it to the tenancy.
//  • Sign in to link — for an email that already has an account (the trigger
//    never re-runs for it), or a returning tenant with a prior account: sign in,
//    then claim_tenancy() links that account to this tenancy.
export default function TenantClaimPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [address, setAddress] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<"confirm" | null>(null);

  // Validate the token and greet with the property address (token-scoped RPC).
  useEffect(() => {
    let active = true;
    supabase.rpc("portal_get", { p_token: token }).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) {
        setInvalid(true);
        return;
      }
      const payload = data as { property?: { address?: string | null } | null };
      setAddress(payload.property?.address ?? null);
    });
    return () => {
      active = false;
    };
  }, [token]);

  // Link the (now signed-in) account to this tenancy, then open the portal.
  async function linkAndGo() {
    const { data, error } = await supabase.rpc("claim_tenancy", { p_token: token });
    if (error) return setErr(error.message);
    if ((data as { error?: string })?.error) {
      return setErr("Couldn't link this account to the tenancy. Please check with your property manager.");
    }
    router.replace("/tenant");
  }

  async function createAccount() {
    if (!email || !password) return setErr("Enter your email and choose a password.");
    const problem = passwordProblem(password);
    if (problem) return setErr(problem);
    setBusy(true);
    setErr("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: "tenant", portal_token: token },
        emailRedirectTo: `${window.location.origin}/tenant`,
      },
    });
    if (error) {
      setBusy(false);
      // Most common: the email already has an account — steer them to sign in.
      if (/already/i.test(error.message)) {
        setMode("signin");
        setErr("You already have an account with this email. Sign in to link it to this tenancy.");
      } else {
        setErr(error.message);
      }
      return;
    }
    // Confirm-email ON → no session yet (trigger already linked via metadata).
    // Confirm-email OFF → session returned; link is in place, open the portal.
    if (data.session) {
      await linkAndGo();
    } else {
      setDone("confirm");
    }
    setBusy(false);
  }

  async function signInAndLink() {
    if (!email || !password) return setErr("Enter your email and password.");
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      return setErr(error.message);
    }
    await linkAndGo();
    setBusy(false);
  }

  if (invalid) {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold tracking-tight">Link not found</h1>
        <p className="mt-2 text-muted">This sign-up link is invalid or has expired. Please check with your property manager.</p>
      </Centered>
    );
  }

  if (done === "confirm") {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold tracking-tight">Almost there ✓</h1>
        <p className="mt-2 text-muted">
          We&apos;ve sent a confirmation email. Confirm your address, then sign in to your portal from the{" "}
          <Link href="/tenant" className="text-accent hover:underline">Tenant login</Link>.
        </p>
      </Centered>
    );
  }

  const creating = mode === "create";

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-center text-2xl font-semibold tracking-tight">{brand.name}</h1>
        <p className="mt-2 text-center text-sm text-muted">
          {creating ? "Create your tenant portal account" : "Sign in to link your account"}
          {address ? ` for ${address}` : ""}.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (creating) createAccount();
            else signInAndLink();
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
            autoComplete={creating ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={creating ? "Choose a password" : "Password"}
            className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
          />
          {creating && <p className="mt-2 text-xs text-muted">{PASSWORD_HINT}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {busy ? "Please wait…" : creating ? "Create account" : "Sign in & link"}
          </button>
        </form>
        <p className="mt-2 min-h-[18px] text-center text-sm text-bad">{err}</p>
        <button
          onClick={() => {
            setMode(creating ? "signin" : "create");
            setErr("");
          }}
          className="mt-2 w-full text-center text-sm text-muted hover:text-foreground"
        >
          {creating ? "Already have an account? Sign in to link it" : "New here? Create an account"}
        </button>
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
