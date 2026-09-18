# Property Tracker — Handoff to Claude Code

## What this is
A self-managed property portfolio tracker: property register, rent ledger with paid/due/late status, and a portfolio dashboard (total properties, weekly rent, blended LVR, arrears flags). Built as a static HTML site backed by Supabase (Postgres), deployed to Vercel. Passcode-gated (not real auth yet — see Security below).

Live now: **https://property-tracker-sand-five.vercel.app** (passcode: `eltham26`)

## Goal for this next phase
Keep developing the same app (don't start a new project) — add receipt/photo capture with tax categorization, quarterly inspection scheduling, refined per-property gearing calculations, and real user authentication. Test everything against the "Eltham Ave, SA" property, which is the live pilot. This is meant to scale to more properties as they're added.

## Where the code lives right now
There is no git repo yet — the site was built and deployed directly from an ephemeral cloud session. The exact current file contents are in this handoff bundle (see attached files: `index.html`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`). Claude Code's first job should be to:
1. Create a git repo (e.g. `property-tracker/`) and add these five files as the starting point.
2. Link it to the existing Vercel project (see below) rather than creating a new one.
3. Link it to the existing Supabase project (see below) rather than creating a new one.

## Vercel
- Deployment was created under the **personal account scope `camwaller7`**, NOT the team `camwaller7's projects` (team id `team_ebGcjE9iDgrrXYQntRV9mKVB`) — these are two different scopes on the same Vercel account, which caused some confusion during setup. Use scope `camwaller7` for this project.
- Project name: `property-tracker`
- Project ID: `prj_jlMTkQ4erDlFNzt9kfIFALFJgT4y`
- Production URL: `property-tracker-sand-five.vercel.app` (alias) / `property-tracker-camwaller7s-projects.vercel.app` (alias)
- Deployment protection (Vercel Authentication / SSO) is currently **disabled** — it was on by default and blocked public access until turned off. Leave it off unless you want to gate the whole site behind a Vercel login.
- To link a local repo: `vercel link` and select the `camwaller7` scope + `property-tracker` project (or use `vercel env pull` / the Vercel dashboard to confirm).
- No custom domain attached yet.

## Supabase (database backend)
- Project name: `property-tracker`
- Project ref / ID: `tioeqxdulxqiptlszldp`
- Region: `ap-southeast-2`
- Postgres version: 17
- Project URL: `https://tioeqxdulxqiptlszldp.supabase.co`
- Anon/publishable key (already hardcoded in `index.html`):
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpb2VxeGR1bHhxaXB0bHN6bGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjcxNzAsImV4cCI6MjEwNTI0MzE3MH0.EFqqd7l0mSfDJL4ndidZ7GDR3F5JGePOKaWAw8LGHq0`
- One migration applied: `20260918011615_init_property_tracker`
- Schema so far:

```sql
-- properties
id              uuid primary key default gen_random_uuid()
address         text
weekly_rent     numeric
rent_due_day    text
lease_start     date
lease_end       date
bond            numeric
purchase_price  numeric
current_value   numeric
loan_balance    numeric
lender          text
created_at      timestamptz default now()

-- payments
id              uuid primary key default gen_random_uuid()
property_id     uuid references properties(id)
due_date        date
amount          numeric
received_date   date
status          text default 'due'   -- 'due' | 'paid' | 'late'
created_at      timestamptz default now()
```

- RLS is **enabled** on both tables, but the current policies grant the `anon` role full read/write. This is a stopgap — see Security below.
- Use the Supabase CLI or dashboard (project ref `tioeqxdulxqiptlszldp`) to pull the schema and add new migrations for the features below, rather than hand-editing via the dashboard SQL editor where possible, so history stays in the repo.

## Security — must fix before relying on this for real tenant/financial data
1. **No real authentication.** The client-side passcode (`eltham26`) is only a UI gate (`sessionStorage` + a JS string comparison) — it doesn't protect the database at all, and the passcode is visible in the page source.
2. **RLS policies currently allow the `anon` key to read and write everything.** Anyone with the URL and the anon key (which is public, embedded in the page) can read or modify all properties and payments.
3. Recommended fix: add Supabase Auth (email/password or magic link is enough for a single user), rewrite RLS policies to require `auth.uid()` matching an `owner_id` column (will need a migration to add that column and backfill it), and gate the app's UI behind a real Supabase session instead of the passcode screen.

## What's built vs what's still to build
Built: property register (add/edit), rent ledger per property with automatic paid/due/late status, portfolio dashboard (property count, total weekly rent, blended LVR, arrears flag count), PWA basics (manifest + service worker so it can be "Added to Home Screen" on a phone).

Still to build (in the order the user wants to tackle them once the core is validated against Eltham Ave):
1. Real authentication + locked-down RLS (see Security above) — do this early, before more data goes in.
2. Receipts & renovation cost tracking: photo capture of receipts, automatic categorization, running renovation cost totals per property, filed in a way that makes handing everything to an accountant at tax time simple. There's a fuller data model for this already drafted (entities: RenovationProject, Expense/Receipt) — see "Property Tracker App Spec" in the user's Claude Docs if accessible, or ask the user to summarize it if not.
3. Quarterly self-managed inspection scheduling (SA rules: 7–28 days' written notice, up to 4 inspections/year, 8am–8pm except Sundays/public holidays, max 2 hours/visit) with reminders.
4. Refined per-property gearing/cash-flow calculations (beyond the current simple LVR) — rental yield, cash-on-cash return, positive/negative gearing status per property.
5. Compliance tracking (smoke alarm checks, bond lodgement status, condition/inspection sheet on file) per property.

## Test property (use this to validate changes)
Eltham Ave, South Australia. Weekly rent $600, 6-month lease starting ~late September 2026, bond capped at 4 weeks' rent = $2,400 under SA rules (rent is under the $800/week threshold).

## Related documents (not code, but useful context)
The user also has, from earlier work on this same project: a "Property Tracker App Spec" and a "Tenant Onboarding SOP" as Claude Docs, a Tenant Handbook template (.docx), and a public tenant-intake form. These aren't part of the code build but explain the fuller intended feature set and the property's compliance context if more detail is needed.
