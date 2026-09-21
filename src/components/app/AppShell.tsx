"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand } from "@/lib/brand";
import { PortfolioProvider } from "@/lib/portfolio";

// Client-side passcode gate carried over from the original app. This is a
// deterrent only, NOT real security — the roadmap replaces it with Supabase
// Auth + row-level security before real tenant data is trusted to it.
const PASSCODE = "eltham26";

const nav = [
  { href: "/app", label: "Dashboard", exact: true },
  { href: "/app/properties", label: "Properties" },
  { href: "/app/renovations", label: "Renovations" },
  { href: "/app/management", label: "Management" },
  { href: "/app/resources", label: "Resources" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // sessionStorage is unavailable during SSR, so read it after mount.
    // Deferred a microtask to keep synchronous setState out of the effect body.
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setUnlocked(sessionStorage.getItem("pt_unlocked") === "1");
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) return null;
  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;

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
            <Link href="/" className="text-xs text-muted hover:text-foreground">
              ← Back to site
            </Link>
          </div>
        </aside>
        <main className="flex-1 px-6 py-8 md:px-10 md:py-12">{children}</main>
      </div>
    </PortfolioProvider>
  );
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState("");

  function submit() {
    if (value === PASSCODE) {
      sessionStorage.setItem("pt_unlocked", "1");
      onUnlock();
    } else {
      setErr("Incorrect passcode.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
        <p className="mt-2 text-sm text-muted">Enter your passcode to continue</p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Passcode"
          className="mt-5 w-full rounded-xl border border-border bg-background px-4 py-3 text-center outline-none focus:border-accent"
        />
        <button
          onClick={submit}
          className="mt-4 w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          Unlock
        </button>
        <p className="mt-3 min-h-[18px] text-sm text-bad">{err}</p>
      </div>
    </div>
  );
}
