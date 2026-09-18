# Folio — Property Portfolio Operating System

Folio is the operating system for a modern property portfolio: investments,
rentals, renovations and management, tracked and run from one place. It pairs a
polished, Apple-style brand site with a working portfolio workspace backed by
Supabase — built to scale from a single rental to a real-estate business.

This continues the original **Property Tracker** (see `docs/HANDOFF.md`), rebuilt
on Next.js with a refined design system while keeping the same Supabase backend.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — zero-config on Vercel.
- **Tailwind CSS v4** with an Apple-inspired token set + a status palette for the
  workspace (`src/app/globals.css`), light and dark.
- **Framer Motion** for scroll reveals and the pinned/scaling product moment.
- **Lenis** smooth scroll.
- **Supabase** (Postgres) for the portfolio data.

## Structure

```
src/
  app/
    page.tsx            Brand landing (Invest · Rent · Renovate · Manage)
    layout.tsx          Root layout, metadata, smooth scroll, PWA
    manifest.ts         PWA manifest (Add to Home Screen)
    app/                The workspace (passcode-gated)
      layout.tsx        AppShell: gate + sidebar
      page.tsx          Portfolio dashboard (KPIs, arrears, lease alerts)
      properties/       Register + gearing + rent ledger
      renovations/      Roadmap
      management/       Roadmap
  components/
    Nav, Reveal, ScrollProduct, SmoothScrollProvider   Brand
    ui/                 Badge, StatCard, Modal
    app/                AppShell, PropertyCard, PropertyForm, Field, ComingSoon
  lib/
    brand.ts            Brand/pillar config (rename/retheme in one place)
    supabase.ts         Supabase client (env with public fallback)
    portfolio.tsx       Data provider (load/save properties, log payments, stats)
    types.ts            Property / Payment types
    format.ts           Money/%/date formatting + gearing + portfolio rollups
```

## Run it

```bash
npm install
npm run dev      # http://localhost:3000  (workspace at /app)
```

Workspace passcode: `eltham26` (client-side gate only — see Security).

## Configuration

Set these in Vercel (Project → Settings → Environment Variables). Both are
optional locally — the app falls back to the existing project's public values so
it runs with zero config. See `.env.example`.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

The anon/publishable key is designed to be exposed in the browser; row-level
security (not key secrecy) is what protects the data.

## Backend (Supabase)

- Project ref: `tioeqxdulxqiptlszldp` · region `ap-southeast-2` · Postgres 17
- Tables: `properties`, `payments` (schema in `docs/HANDOFF.md`)
- RLS is enabled but currently grants `anon` full read/write — a stopgap.

## Deploy

Existing Vercel project (personal scope `camwaller7`, project `property-tracker`).
Push this repo to GitHub and import it, or run `vercel` and select that scope +
project. Deployment protection is off so the site is public.

## Security (must fix before real tenant/financial data)

1. No real authentication — the passcode is a UI gate only, visible in source.
2. RLS lets the public anon key read/write everything.

**Fix:** add Supabase Auth, an `owner_id` column, and RLS policies keyed to
`auth.uid()`; gate the workspace behind a real session instead of the passcode.
This is the first item on the Management roadmap.

## Management (built)

The Management workspace (`/app/management`) is live and usable end-to-end:

- **Tenancies** — a record per tenant linked to a property (contact, lease dates,
  move-in date, weekly rent, emergency contact, notes) with upcoming/active/ended
  status.
- **Move-in onboarding checklist** — seeded with the SA move-in essentials
  (agreement signed, ingoing condition report, bond collected & lodged with CBS,
  first rent, smoke alarms, keys, handbook, insurance). Tick items off with the
  tenant; progress is tracked per tenancy.
- **Bond** — records the amount, CBS lodgement status and reference, and flags a
  bond that exceeds the SA legal cap (4 weeks' rent ≤ $800/week, else 6 weeks).
- **Inspections** — schedule entry / routine / exit inspections. Routine
  inspections are validated against SA rules: 7–28 days' written notice (the app
  shows the valid date window) and no Sundays. Mark them completed or cancelled.

Backed by two additive tables (`tenancies`, `inspections`); see
`supabase/migrations/`. SA rules live in `src/lib/sa-rules.ts`.

## Roadmap

- **Auth + locked-down RLS** — before more real tenant data goes in (the
  Management tables use the same anon stopgap policy as properties/payments).
- **Renovations** — receipt capture, tax categorisation, cost-vs-value, accountant export.
- **Compliance schedule** — recurring smoke-alarm checks and reminders beyond the
  move-in checklist.
- **Deeper finance** — cash-on-cash return, per-property gearing status.

Test property for validating changes: **Eltham Ave, SA** — $600/week, 6-month
lease from ~late Sep 2026, bond capped at $2,400 under SA rules.
