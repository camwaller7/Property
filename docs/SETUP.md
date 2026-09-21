# Folio — Go-Live Setup Runbook

Everything that must be done in a **browser** to get the app deployed and fully
working. The code, database tables, storage buckets and security policies are
already done and pushed; what's left are dashboard steps (Vercel, Zapier) that
can't be done from the build environment, plus an end-to-end test.

Work top to bottom. Each task has a **Done when** check.

## Key facts (reference)

| Thing | Value |
|---|---|
| GitHub repo | `camwaller7/Property` |
| Branch with all the code (repo default) | `claude/funny-cori-pmcdv6` |
| Vercel team | `camwaller7's projects` |
| Existing (old, unlinked) Vercel project | `property-tracker` (personal scope) |
| Supabase project ref | `tioeqxdulxqiptlszldp` |
| Supabase URL | `https://tioeqxdulxqiptlszldp.supabase.co` |
| Workspace access | Supabase Auth login (create a manager user — Task 1b) |
| App routes | `/` (site), `/app` (workspace, sign-in), `/onboard/<token>`, `/portal/<token>` |

Environment variables the app uses:

```
NEXT_PUBLIC_SUPABASE_URL       = https://tioeqxdulxqiptlszldp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = (the anon key — see below; it is public by design)
ZAPIER_EMAIL_WEBHOOK_URL       = (from Task 2; enables manager email sending)
STRIPE_SECRET_KEY              = (from Task 5; enables paid plans — server-only)
STRIPE_PRICE_ID                = (from Task 5; the Pro recurring price)
STRIPE_WEBHOOK_SECRET          = (from Task 5; verifies Stripe webhook calls)
SUPABASE_SERVICE_ROLE_KEY      = (from Task 5; server-only; used ONLY by the billing webhook)
```

The anon key (public, safe in the browser — RLS protects the data):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpb2VxeGR1bHhxaXB0bHN6bGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjcxNzAsImV4cCI6MjEwNTI0MzE3MH0.EFqqd7l0mSfDJL4ndidZ7GDR3F5JGePOKaWAw8LGHq0
```

> The app already falls back to these Supabase values if the env vars are unset,
> so setting them is recommended but not strictly required for it to run.

---

## Task 1 — Deploy the site from GitHub (Vercel)

**Why it can't be done from the build env:** the Vercel↔GitHub app isn't
authorized for the `Property` repo, and the existing project sits in a Vercel
scope the automation couldn't reach.

1. **Authorize GitHub access.** Open
   <https://github.com/apps/vercel/installations/select_target>, choose the
   **camwaller7** account, and under *Repository access* add
   **`camwaller7/Property`** (it's currently only granted to `influencer-PA`).
   Save.
2. **Import the project.** Go to <https://vercel.com/new>, pick the
   **camwaller7's projects** team, find **`camwaller7/Property`**, click
   **Import**.
   - Framework preset should auto-detect **Next.js** — leave build/output
     settings at their defaults.
   - If it complains the name `folio` already exists, either name this one
     `folio` and delete the empty stray project first (see Troubleshooting), or
     name it `property-folio`.
3. **Add environment variables** (Project → Settings → Environment Variables),
   for the **Production** and **Preview** environments:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://tioeqxdulxqiptlszldp.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *(the anon key above)*
   - Leave `ZAPIER_EMAIL_WEBHOOK_URL` for Task 2.
4. **Set the production branch.** Project → Settings → Git → **Production
   Branch** = `claude/funny-cori-pmcdv6` (this is the branch that currently has
   all the code). Save. *(Later, when work moves to a `main` branch, change this
   to `main`.)*
5. **Deploy.** Trigger a deployment (Deployments → Redeploy, or push any commit).

**Done when:** the deployment succeeds and the production URL loads the Folio
landing page, and visiting `/app` shows the **manager sign-in** screen.

### Task 1b — Auth settings (public sign-up)

The workspace uses real Supabase Auth, and **anyone can now create their own
account** to track their own properties. Each account gets its own organization
and data is isolated per org — RLS scopes every table to the caller's org
(verified server-side), so users only ever see their own data.

1. Supabase dashboard → project `tioeqxdulxqiptlszldp` → **Authentication →
   Sign In / Providers** → ensure **Email** is enabled and **"Allow new users to
   sign up" is ON**.
   - **Redirect URLs** (Authentication → URL Configuration) must allow the auth
     callback route. A wildcard like `https://<your-domain>/**` (and
     `https://*-<team>.vercel.app/**` for previews) covers `/auth/callback` and
     `/auth/reset`. Set **Site URL** to the production domain (not localhost).
2. **Sign-in options:** the login screen supports password, **magic link**, and
   **password reset**. All email links redirect (at runtime, via
   `window.location.origin`) to `/auth/callback`, which hydrates the session and
   routes into `/app` (reset links go to `/auth/reset` to set a new password).
   No localhost is hardcoded anywhere.
3. **Email confirmation:** your choice.
   - *On* (recommended for production) — new users must click a confirmation link
     before signing in. The app already handles this (shows "check your email").
     Note Supabase's built-in email is rate-limited; for volume, configure your
     own SMTP under Authentication → Emails.
   - *Off* (fastest for testing) — Authentication → Providers → Email → disable
     "Confirm email"; sign-ups log in immediately.
4. Your **own company account** is just the first account you create (via the
   landing page "Create your free account", or Authentication → Users → Add user
   with Auto Confirm). Your managed portfolio lives under it.

**Done when:** at `/app` (or the landing "Create your free account") you can
register, land in the dashboard, and a second test account sees none of the
first account's data.

---

## Task 2 — Turn on manager email (Zapier)

The app sends email by POSTing to a Zapier **Catch Hook**. You build one Zap.

1. In Zapier, **Create Zap**.
2. **Trigger:** app **Webhooks by Zapier** → event **Catch Hook** → Continue.
   Copy the **webhook URL** it shows (looks like
   `https://hooks.zapier.com/hooks/catch/xxxx/yyyy/`).
3. **Action:** app **Gmail** → event **Send Email** → connect/choose your Gmail
   account when prompted. Map the fields from the webhook:
   - **To** → `to`
   - **Subject** → `subject`
   - **Body** → `body`
   - **From Name** → `from_name` (optional)
   *(You can swap Gmail for Outlook, or an SMS app, if you prefer.)*
4. **Publish / turn the Zap ON.**
5. Back in **Vercel → Settings → Environment Variables**, add
   `ZAPIER_EMAIL_WEBHOOK_URL` = the webhook URL from step 2 (Production +
   Preview). **Redeploy** so the new variable takes effect.

**Done when:** in the app, open a tenancy → **Email tenant** (or **Email link**)
→ send a test to yourself → it returns "Sent ✓" and the email arrives.

> Optional: a test POST to confirm the hook independently —
> `curl -X POST <webhook-url> -H "Content-Type: application/json" -d '{"to":"you@example.com","subject":"Test","body":"Hello","from_name":"Folio"}'`

---

## Task 3 — End-to-end test in the live app

Do this once against the real property so you trust it before the tenant uses it.
(The build environment can't reach Supabase, so this is the first real
round-trip.)

1. **Sign in & add the property.** `/app` → sign in with your manager login
   (Task 1b) → Properties → **Add property** (e.g. Eltham Ave, weekly rent 600).
   Confirm it saves and the dashboard KPIs update.
2. **Create a tenancy.** Management → **New tenancy**, link it to the property,
   add the tenant's name + email. Confirm the bond cap hint appears.
3. **Onboarding link.** On the tenancy → **Generate onboarding link** → open the
   link in a private/incognito window. Fill the form, upload a test file for the
   required documents, and confirm **you cannot submit** until everything's
   filled. Submit.
4. **Back in the workspace**, confirm the application shows as **Submitted**, the
   tenant's details flowed onto the tenancy, and each uploaded document opens via
   its button.
5. **Contract & handbook.** Click **Generate contract & handbook** →
   **Print / Save as PDF** and confirm it's prefilled.
6. **Tenant portal.** On the tenancy → **Enable tenant portal** → open the portal
   link in a private window. Post a notice from the workspace and confirm it
   appears. Add a handout in **Resources** and confirm it shows and opens in the
   portal.
7. **Rent ledger.** Log a payment on the property and confirm paid/due/late
   status and the portal's "next due" both look right.

**Done when:** all seven steps behave as described end to end.

---

## Task 4 — Security (already locked down in code + database)

The anon stopgap has been replaced (see README "Security model"):

- The workspace requires Supabase Auth sign-in — **your only dashboard action is
  Task 1b** (create the manager user, sign-ups off).
- The public anon key can no longer read/write any table; public links work only
  through token-scoped RPCs that return a single record.
- ID/income documents are in a private bucket (manager-only read).

Nothing else to do here. Future multi-owner scoping (`owner_id` + `auth.uid()`
RLS) is a later code change, not a go-live step.

---

## Task 5 — Billing / paid plans (optional, when ready to charge)

Free accounts are capped (3 properties); Pro is unlimited. Payments run through
Stripe. The app works fully without this — the Billing page just shows "billing
not configured" on upgrade until these are set.

1. Create a **Stripe** account. In **test mode** to start.
2. **Products → add a product** "Folio Pro" with a **recurring** price; copy the
   **price ID** (`price_...`) → env `STRIPE_PRICE_ID`.
3. **Developers → API keys** → copy the **secret key** (`sk_...`) → env
   `STRIPE_SECRET_KEY`.
4. **Developers → Webhooks → Add endpoint** → URL
   `https://<your-domain>/api/billing/webhook`, events:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy the **signing secret** (`whsec_...`) →
   env `STRIPE_WEBHOOK_SECRET`.
5. Supabase dashboard → **Project Settings → API → service_role key** → copy →
   env `SUPABASE_SERVICE_ROLE_KEY`. **Server-only — never expose this; it's used
   only by the billing webhook to update the org's plan.**
6. Add all four env vars in Vercel and **redeploy**.

**Done when:** on the Billing page, **Upgrade to Pro** opens Stripe Checkout;
after a test payment the plan flips to Pro (via the webhook) and the property
cap lifts.

The **same Stripe setup also powers online rent collection** — no extra keys or
webhook. Turn it on per org in **Billing → Rent payments → "Accept rent payments
online"**; tenants then get a **Pay now** button in their portal, and a
successful payment auto-marks the matching ledger row **paid** (the
`checkout.session.completed` webhook, distinguished by `metadata.kind = "rent"`).
Rent is received into the platform Stripe account; per-landlord payouts (Stripe
**Connect**) are future work for multi-landlord operation.

---

## Troubleshooting

- **Vercel import can't find the repo** → the GitHub authorization in Task 1.1
  didn't include `Property`. Redo it and refresh.
- **A stray empty `folio` project exists** (from an earlier automated attempt) →
  Vercel → that project → Settings → **Delete Project**, then re-import under the
  name you want.
- **Build fails on Vercel but passed locally** → check the deployment's build
  logs; most likely a missing env var. The app builds without env vars (it has
  fallbacks), so this is rare.
- **Email returns "email isn't configured yet"** → `ZAPIER_EMAIL_WEBHOOK_URL`
  isn't set on the environment you're testing, or you didn't redeploy after
  adding it.
- **Email returns a 502 / "Zapier webhook returned …"** → the Zap is off, or the
  field mapping is wrong. Turn the Zap on and re-check the To/Subject/Body
  mapping.
- **Documents won't open in the portal/workspace** → confirm the Supabase
  storage buckets `tenant-documents` and `tenant-resources` exist and are
  private (they were created by migration; nothing to do unless they're missing).
