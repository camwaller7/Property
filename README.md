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
ZAPIER_EMAIL_WEBHOOK_URL   # server-only; enables manager email sending (see below)
```

The anon/publishable key is designed to be exposed in the browser; row-level
security (not key secrecy) is what protects the data.

### Email sending (via Zapier)

Managers send emails from the app through a Zapier webhook, so no email domain
setup is needed — you use whatever you connect in Zapier (Gmail, Outlook, SMS…).

1. In Zapier, create a Zap: **Trigger = Webhooks by Zapier → Catch Hook**.
2. **Action = your email app** (e.g. Gmail → Send Email). Map the incoming
   fields: `to`, `subject`, `body`, `from_name`.
3. Copy the Catch Hook URL and set it as **`ZAPIER_EMAIL_WEBHOOK_URL`** in Vercel
   (Project → Settings → Environment Variables). Turn the Zap on.

Until that var is set, the app's send endpoint (`POST /api/email`) returns a
clear "email isn't configured yet" message instead of failing silently. Every
send is recorded in the `email_log` table.

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
- **Tenant onboarding link** — generate a secure per-tenancy link (with a
  copy-ready email) to send the applicant. It opens a public form at
  `/onboard/[token]` covering personal details, employment/income, rental
  history, references, emergency contact, declarations and document uploads
  (photo ID, proof of income). The form **cannot be submitted with any required
  field or document missing** (`validateApplication` in
  `src/lib/application-schema.ts`). On submit, files upload to a private Supabase
  Storage bucket, the data lands on the application row, and key details flow
  into the tenancy automatically. The owner can then view the submission,
  open documents via short-lived signed URLs, and generate a **prefilled
  Residential Tenancy Agreement + Tenant Handbook** (print / save as PDF) at
  `/app/management/documents/[id]`.
- **Tenant portal** — enable a secure per-tenancy portal (`/portal/[token]`,
  no login) where the tenant sees rent + next-due + payment history, lease &
  bond summary, notices/reminders you post, shared documents & handouts, and
  their property manager's contact. Tenants **submit maintenance requests**
  (category, urgency, description, optional photo) and track their status; the
  manager works them from a **Maintenance requests** panel on `/app/management`
  (status control + photo view). All portal reads/writes go through token-scoped
  `SECURITY DEFINER` RPCs (`portal_get`, `portal_submit_request`).

Backed by additive tables (`tenancies`, `inspections`, `tenant_applications`,
`notices`, `portal_resources`, `maintenance_requests`) and private storage
buckets; see `supabase/migrations/`. SA rules live in `src/lib/sa-rules.ts`; the
application schema in `src/lib/application-schema.ts`.

## Security model (locked down)

The anon stopgap has been replaced:

- **Manager workspace requires Supabase Auth.** `/app` shows a real email/password
  sign-in; once signed in, every query runs as `authenticated`, and all tables
  have `authenticated`-only RLS policies. There is no more passcode.
- **The public anon key can no longer read or write any table.** RLS grants no
  access to `anon`. Public token pages reach data **only** through token-scoped
  `SECURITY DEFINER` RPCs (`onboard_get`, `onboard_submit`, `portal_get`), each of
  which returns just the one record matching the link's token — so a leaked anon
  key can't enumerate tenants' data.
- **Documents:** ID/income uploads live in a **private** bucket — the applicant
  can upload (anon insert) but only the signed-in manager can read them (via
  signed URLs). Non-sensitive handouts live in a **public** bucket.

Supabase's linter flags the three token RPCs as publicly executable — that is
intentional (public-by-token access) and safe, as each requires a valid,
unguessable token and returns only the matching row.

### Multi-tenant (self-serve accounts)

Public sign-up is open: anyone can create an account from the landing page or
`/app` and track their own portfolio. Every owned table has an `owner_id`
(defaulting to `auth.uid()`) and RLS scoped to `owner_id = auth.uid()`, so each
account sees and edits only its own data — verified server-side (user A's rows
are invisible to user B). Your company's own managed portfolio is simply the
first account you create.

Enable sign-ups and choose email confirmation under Supabase → Authentication —
see `docs/SETUP.md`.

### Teams (organizations)

Data is scoped by **organization**, not individual user. Every sign-up
auto-creates an org (the user becomes its owner); RLS scopes all tables to
`org_id in (my orgs)`, so an org's members share one workspace and no org can
see another's data (verified server-side). Roles are `owner` / `admin` /
`member`; admins manage the team and billing. Invite teammates from **Team**
(`/app/team`) via a link they open at `/join/<token>` once signed in.

### Billing (Stripe)

Plans live on the organization (`free` / `pro`). Free is capped (3 properties);
Pro is unlimited. The **Billing** page (`/app/billing`) starts Stripe Checkout
via `/api/billing/checkout`, and `/api/billing/webhook` (verified by signature,
writing with the service-role key) keeps the plan in sync. Both are env-gated —
see `docs/SETUP.md` Task 5. Until Stripe keys are set, everything works on the
free plan.

### Future hardening

- **Per-org storage scoping** — uploaded files are protected by unguessable
  paths + private buckets; tightening storage RLS to the org is a follow-up.
- **Multi-org membership / org switching** — the schema supports a user being in
  several orgs; the UI currently uses their first org as active.

## Roadmap
- **Renovations** — receipt capture, tax categorisation, cost-vs-value, accountant export.
- **Scheduled reminders** — automatic emails when rent/bills fall due (cron/edge function).
- **Compliance schedule** — recurring smoke-alarm checks and reminders beyond the
  move-in checklist.
- **Deeper finance** — cash-on-cash return, per-property gearing status.
- **Multi-owner** — `owner_id` + `auth.uid()`-scoped RLS (see Security model).

Test property for validating changes: **Eltham Ave, SA** — $600/week, 6-month
lease from ~late Sep 2026, bond capped at $2,400 under SA rules.
