"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { brand } from "@/lib/brand";
import { supabase } from "@/lib/supabase";
import { PortfolioProvider } from "@/lib/portfolio";

const nav = [
  { href: "/app", label: "Dashboard", exact: true },
  { href: "/app/properties", label: "Properties" },
  { href: "/app/renovations", label: "Renovations" },
  { href: "/app/management", label: "Management" },
  { href: "/app/resources", label: "Resources" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) return null;
  if (!session) return <LoginScreen />;

  return (
    <PortfolioProvider>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-border md:min-h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between px-6 py-5">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              {brand.name}
            </Link>
            <Link href="/" className="text-xs text-muted hover:text-foreground md:hidden">
              Home
            </Link>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:flex-col md:pb-0">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-surface text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden px-6 py-6 md:block">
            <div className="mb-2 truncate text-xs text-muted" title={session.user.email ?? ""}>
              {session.user.email}
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-muted hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </aside>
        <main className="flex-1 px-6 py-8 md:px-10 md:py-12">{children}</main>
      </div>
    </PortfolioProvider>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    if (!email || !password) {
      setErr("Enter your email and password.");
      return;
    }
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
    // On success, onAuthStateChange swaps this screen for the workspace.
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-center text-2xl font-semibold tracking-tight">{brand.name}</h1>
        <p className="mt-2 text-center text-sm text-muted">Manager sign in</p>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="mt-5 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && signIn()}
          placeholder="Password"
          className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent"
        />
        <button
          onClick={signIn}
          disabled={busy}
          className="mt-4 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-3 min-h-[18px] text-center text-sm text-bad">{err}</p>
      </div>
    </div>
  );
}
