import Link from "next/link";
import Nav from "@/components/Nav";
import Reveal from "@/components/Reveal";
import ScrollProduct from "@/components/ScrollProduct";
import { brand } from "@/lib/brand";

export default function Home() {
  return (
    <>
      <Nav />

      {/* Hero — large display type, generous top padding to clear the fixed
          nav, and nothing else competing for attention. */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <Reveal>
          <p className="mb-4 text-sm font-medium text-muted">{brand.full}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="max-w-4xl text-balance text-6xl font-semibold tracking-tightest md:text-8xl">
            Your whole property world, in one place.
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-6 max-w-xl text-balance text-lg text-muted md:text-xl">
            {brand.description}
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/app"
              className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-80"
            >
              Property manager login
            </Link>
            <Link
              href="/tenant"
              className="rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-surface"
            >
              Tenant portal login
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            New here? Managers can <Link href="/app" className="text-accent hover:underline">start free</Link>.
            Tenants use the sign-up link from their property manager.
          </p>
        </Reveal>
      </section>

      {/* Scroll-pinned product moment — the signature Apple interaction. */}
      <ScrollProduct />

      {/* The four pillars — one idea per section, anchored for the nav. */}
      <section className="mx-auto max-w-6xl px-6 py-32">
        <Reveal>
          <h2 className="max-w-2xl text-4xl font-semibold tracking-tightest md:text-5xl">
            Everything property. Nothing scattered.
          </h2>
          <p className="mt-4 max-w-xl text-muted">
            Four sides of the same portfolio, tracked and run from a single workspace.
          </p>
        </Reveal>
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {brand.pillars.map((p, i) => (
            <Reveal key={p.key} delay={i * 0.08}>
              <div id={p.key} className="h-full scroll-mt-24 rounded-3xl bg-surface p-8">
                <div className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {p.label}
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">{p.headline}</h3>
                <p className="mt-3 text-muted">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Sign-up band — self-serve: create an account and track your own portfolio. */}
      <section id="signup" className="scroll-mt-24 px-6 py-32">
        <div className="mx-auto max-w-4xl rounded-3xl bg-surface px-8 py-16 text-center">
          <Reveal>
            <h2 className="text-4xl font-semibold tracking-tightest md:text-5xl">
              Track your own properties, free.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Create an account and get your whole portfolio in one place — rent, leases, gearing,
              inspections and documents. No spreadsheets, no setup.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/app"
                className="rounded-full bg-foreground px-8 py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
              >
                Create your free account
              </Link>
              <Link
                href="/app"
                className="rounded-full border border-border px-8 py-3.5 text-sm font-medium transition-colors hover:bg-background"
              >
                Sign in
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Closing statement — mirrors the hero's type treatment to bookend. */}
      <section className="mx-auto max-w-4xl px-6 py-40 text-center">
        <Reveal>
          <h2 className="text-5xl font-semibold tracking-tightest md:text-6xl">
            Built to grow with you.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-muted">
            From your first rental to a portfolio worth managing like a business — {brand.name} scales
            from a single property to the whole company.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <Link
            href="/app"
            className="mt-10 inline-block rounded-full bg-foreground px-8 py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
          >
            Open the workspace
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-border px-6 py-10 text-center text-sm text-muted">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/app" className="hover:text-foreground">Manager login</Link>
          <Link href="/tenant" className="hover:text-foreground">Tenant login</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
        </div>
        <p className="mt-3">{brand.full} · Built with Next.js on Vercel, backed by Supabase.</p>
      </footer>
    </>
  );
}
