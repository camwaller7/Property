# Corvelle Property — Rolling To-Do

Two living lists, kept current as we work. `docs/ROADMAP.md` holds the full history of what's shipped; this file is just "what's left, by priority".

Legend: `[ ]` open · `[~]` in progress / waiting · `[x]` done · **(you)** dashboard/browser · **(build)** code (Claude) · **(test)** hands-on check

_Last updated: 2026-09-30_

---

## ⛔ OUTSTANDING — blocked on you / can't be completed from here
The rolling list of things I can't finish myself, because they need a dashboard
action, an external account/secret, a hands-on test, or a product decision.
Kept current as we go.

**Needs a setting or secret only you can add:**
- [ ] **(you)** Resend: verify `corvelleproperty.com` + set sender to `noreply@corvelleproperty.com`.
- [ ] **(you)** GoDaddy DNS: add SPF / DKIM / DMARC (`docs/EMAIL-DELIVERABILITY.md`).
- [ ] **(you)** Vercel env: `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` (reminder cron 401s without them).
- [ ] **(you)** Vercel env: `UNSUBSCRIBE_SECRET` (any long random string) so reminder emails carry a self-serve unsubscribe link; without it they fall back to a "reply to opt out" line. Optional: `EMAIL_BUSINESS_ADDRESS` (your business postal address) to print in the email footer.
- [ ] **(you)** Supabase Auth: decide the **Confirm email** toggle; enable leaked-password protection + CAPTCHA before public.
- [x] **(you)** `ANTHROPIC_API_KEY` set in Vercel (2026-09-29) — unlocks the AI assistant **and** the messaging-assistant feature below.
- [ ] **(you)** **Supabase Pro / backups** — Free plan has **no project backups or PITR** (verified in dashboard). A bad migration or accidental delete has no recovery path today; upgrade to Pro **before your first real sign-ups**, not after.

**Needs you to do a real-world test (I fix what it surfaces):**
- [ ] **(test)** Live sign-up on the domain → send me the email → I verify org isolation.
- [ ] **(test)** End-to-end walkthrough on Eltham Ave (add property → tenancy → onboarding → agreement → portal → maintenance → inspection → costs → rent).

**Needs a product decision before I can build (see the section it belongs to):**
- [ ] **Messaging assistant (Telegram/WhatsApp → auto-file)** — awaiting your choice of channel + go-ahead. Spec in 🅱 "Later product".

---

## 🅰 TO DO NOW — make it fully usable for your 1-month live self-test
Goal: run your own properties (starting Eltham Ave, SA) through the whole flow for a month to shake out imperfections. Online billing/subscriptions are **not** required for this — you can mark rent paid manually — so Stripe subscriptions live on the pre-public list.

### Ship what's built
- [x] **PR #3 — Cost tracking**, **PR #4 — Inspection checklist + condition photos**, **PR #5 — rolling TODO** and **PR #6 — Resend email** all merged to `main`.

### Management rework (raised while adding a real tenant) — staged
- [x] **(build)** **PR 1** — richer per-person **emergency contact** (name, relationship, phone) + **multiple people under one lease**. New org-scoped `lease_tenants` table; the primary person's contact mirrors onto the tenancy row so the portal/applications/emails keep working; manager emails **fan out to everyone on the lease**; private `tenant-documents` bucket provisioned for per-person IDs.
- [x] **(build)** **PR 2** — Management **Dashboard** tab: clickable event calendar (click a day → what's due) + info tiles (urgent & outstanding, maintenance requests, inspections due 30d, lease expiries 30d). Separate **Tenants** tab with at-a-glance critical flags (rent overdue/soon, urgent/open maintenance), opening a full **lease detail view** (per-person ID/documents via the private `tenant-documents` bucket, contact + emergency, move-in checklist, onboarding/portal links, inspections, condition photos, inspection checklist).

### Testing fixes (raised during live testing) — staged
- [x] **(build)** **PR A** — **auto-schedule quarterly routine inspections** from lease start (first at +3 months, on the nearest weekday); **reminder markers 1 month / 2 weeks / 3 days** before each, shown in both the management calendar and the tenant portal. **Onboarding notice** telling applicants a contract to sign follows review. **Send documents to tenant**: upload the official/signed contract or the property handbook (PDF) from the lease detail → appears in the tenant portal + emails everyone on the lease.
- [x] **(build)** **PR C** — **tenant accounts + dual login**. Landing page now has **Property manager login** (`/app`) and **Tenant login** (`/tenant`). The portal link a manager sends is now a **create-account** page (`/tenant/claim/<token>`); the signup is linked to the tenancy (role-aware `handle_new_user`, new `tenant_portal_users` table) so tenants sign in from the landing page and land in their portal. Also added `Reply-To` to app email.
- [~] **(you)** **Email deliverability** (mail landing in junk): verify `corvelleproperty.com` in Resend + add **SPF / DKIM / DMARC** DNS at GoDaddy — full steps in `docs/EMAIL-DELIVERABILITY.md`.
- [x] **(build)** **PR B (cron)** — **automatic reminder sending**: `vercel.json` runs `/api/cron/reminders` daily (21:00 UTC ≈ 7:30am Adelaide); it emails everyone on the lease 30 / 14 / 3 days before each scheduled inspection, de-duped via `inspection_reminders_sent`.
- [ ] **(you)** Set **`CRON_SECRET`** (any long random string) and **`SUPABASE_SERVICE_ROLE_KEY`** in Vercel env so the reminder cron can run and send. (Vercel Cron sends the `CRON_SECRET` automatically; the endpoint 401s without it.)

### Lease lifecycle & tenant portability — staged
- [x] **(build)** **PR 1** — **End tenancy**: manager clicks "End tenancy" (optional reference note) → writes a tenant-owned `rental_history` snapshot and marks the tenancy ended. The tenant portal then shows a **past-tenancy record** (property name + lease dates only; live rent/notices/maintenance/documents hidden) and their **account stays live**. The portal also auto-switches to this view once `lease_end` passes.
- [x] **(build)** **PR 2** — **Transfer a tenant** to another of your properties: one "Transfer to another property" action on the lease card moves the tenant + everyone on the lease (and their documents) into a fresh live tenancy on the target property, re-points their portal login, and ends the old tenancy with a rental-history snapshot — no re-application. Same-portfolio only (`transfer_tenancy` RPC never crosses org isolation).
- [x] **(build)** **PR 3** — **Portable rental history**. The tenant portal (signed-in) shows their **rental history across every manager** (property, dates, rent, reference note). A new PM can **request** a prospective tenant's history by email on the Management → **History references** tab; the tenant sees the request in their portal and **approves / declines / revokes** it. Only an approved share lets that one org read the history (extended `rental_history` RLS via `rental_history_shares` + consent RPCs) — the sole path across org isolation, always tenant-controlled.

### Recurring bills & calendar
- [x] **(build)** **Council rates / water / other recurring bills** per property (amount, cycle, next-due, payer) on the Cost tracking page — auto-projected into the Management **calendar** and a new **"Rates & bills due (30 days)"** dashboard tile. Council rates are landlord-only; **water/tenant-recoverable bills** have a **"Send to tenant"** action that posts a portal notice. Landlord-only data — never shown in the tenant portal.
- [x] **(build)** Calendar list below the grid is now a **2-week snapshot** ("Next 2 weeks") instead of a flat list.
- [x] **(build)** **GST on Cost tracking** — each cost records the **total (GST-inclusive) amount** and captures the **GST amount** explicitly: an "Amount includes GST" flag plus an editable **GST amount ($)** field that pre-fills to the AU 1/11th default but takes the exact figure off the invoice (untick for GST-free rates/water/land-tax/interest). The Breakdown shows a **GST included** line (sum of captured GST = BAS input-tax credit), each row shows its GST, and the CSV export includes GST-inclusive + GST-component columns. Not tax advice.

### Auth / sign-in (Section C tail)
- [x] **(build)** Tenant claim link handles an **existing account**: if the email already has an account (or a returning tenant already has one), they can **sign in on the claim link to link** it to the tenancy (`claim_tenancy` RPC), instead of the sign-up dead-ending on "already registered".
- [~] **(you)** Fix Resend SMTP **sender → `noreply@corvelleproperty.com`** (gmail can't be a verified sender) so confirmation emails send.
- [ ] **(test)** Do a real sign-up on the live domain → tell me the email → **I verify the new isolated org** (live cross-org isolation check) to close Section C end-to-end.

### Manager ↔ tenant email (core to real use)
- [x] **(build)** App email runs on **Resend** (`/api/email`, `RESEND_SECRET` set). Remaining work is deliverability (DNS, above), not code.

### Prove the whole loop on a real property
- [ ] **(test)** End-to-end walkthrough on Eltham Ave: add property → create tenancy → send onboarding link → tenant submits → generate agreement/handbook → enable portal → log a maintenance matter (thread both sides) → schedule inspection + tenant reminder → log costs + receipt → upload condition photos → record rent + mark paid.
- [ ] **(build)** Fix anything that walkthrough surfaces (this is the point of the month).

### State correctness for where you operate
- [x] **(build)** **SA** verified against CBS (Sep 2026): bond 4wk ≤ $800/wk else 6wk (from 1 Apr 2023); routine inspections 7–28 days notice, max 4/yr, 8am–8pm, not Sun/public holidays, max 2 hrs. Values in `src/lib/jurisdictions.ts` are current. *(Other states still to confirm before public.)*
- [x] **(build)** Tenant→`/app` guard: a tenant who opens the manager app is redirected to `/tenant`.
- [x] **(build)** Draft **Terms of Service** + **Privacy Policy** pages (`/legal/terms`, `/legal/privacy`, linked in the footer) + "not legal advice" note on the generated handbook. *(Placeholders + lawyer review before public — see 🅱.)*

### Branding & polish
- [ ] **(build)** **Landing-page logo reveal** — on first open of the site/app, play a brief logo-reveal animation, then reveal the page (from a forwarded reel, François Deverre). Respect `prefers-reduced-motion` and only show once per session.

### Optional during the test
- [ ] **(you)** Set `ANTHROPIC_API_KEY` if you want to trial the **AI assistant** (Pro feature) during the month.
- [ ] **(you/build)** Set up **Stripe Connect (Express)** only if you want to test *online rent collection* live; otherwise defer — manual "mark paid" is fine for the test.

---

## 🅱 TO DO BEFORE PUBLIC — hardening for real customers
Everything needed before other people create accounts and pay.

### Security & auth
- [x] **(build)** **Inactivity auto-logout** — the manager workspace signs you out after **4 hours** of browser inactivity (or if the browser was closed longer than that), forcing a fresh login. RLS already isolates data; this is the extra safety layer on the persisted session.
- [x] **(build)** **Lock down internal RPCs** (from Supabase security advisors) — done in two passes. First pass (`20260929_lock_down_internal_rpcs.sql`) revoked anon/authenticated EXECUTE on `notify_manager` (both overloads), `render_notification_email`, `get_org_owner_email`, `check_upcoming_notifications`, `notify_new_maintenance_request`, `mark_overdue`, `app_base_url`, `reconcile_payment` (+ anon on `generate_rent_schedule`). Second pass (`20260930_lock_internal_rpcs_followup.sql`, applied live 2026-09-30) closed the three the app still reached via the **anon client**, after moving those calls to the service-role client: **`log_email`** (anon could forge `email_log` rows) and **`is_email_suppressed`** (unsubscribe-status enumeration) → now service-role-only; **`generate_rent_schedule`** kept callable by signed-in managers but **now self-checks org membership** (`auth.uid()` present ⇒ `p_org` must be in `my_org_ids()`; the `run_daily` service-role sweep with `p_org` null still works) — it previously inserted rent rows into any org's `payments`. Also fixed a **latent hole from PR #29**: `rate_limit_touch` was left anon/authenticated-callable (its migration's `revoke … from public` didn't drop the direct default-privilege grants), which allowed poisoning a victim's rate-limit bucket over PostgREST — now revoked to service-role only. Verified live with `has_function_privilege`/`aclexplode`; advisor anon SECURITY-DEFINER count 24→22, authenticated 26→24 (remainder are the intended token-guarded portal RPCs + self-checking helpers).
- [x] **(build)** `search_path` on `app_base_url` + `render_notification_email` — already `search_path=public` (verified live; done in an earlier pass). Documented **deny-all** on the service-role-only tables `inspection_reminders_sent`, `email_unsubscribes`, `rate_limits` via `comment on table` (RLS on, no policy = no anon/authenticated access; advisor keeps them as INFO-level, now intentional + documented in-DB).
- [x] **(build)** **`/api/email` is no longer an open relay** — it now authorises every send against a valid manager session (Supabase access token), a valid tenant-portal token (restricted to emailing that tenancy's manager), or the cron `CRON_SECRET`. Unauthenticated callers get 401.
- [~] **(build)** **Numeric rate-limiting** — foundation shipped + applied to `/api/email`. New `rate_limits` table + `rate_limit_touch(key, max, window)` fixed-window RPC (SECURITY DEFINER, **service-role-only EXECUTE** so the key is always server-derived — can't be used to pre-exhaust a victim's bucket); `supabase/migrations/20260930_rate_limits.sql`, applied live. `/api/email` now throttles per principal (manager id / portal token, IP fallback) at **60/hour**, cron exempt, fails open if the service key is unset (returns 429 when over). Pure key helpers in `lib/rateLimit` (unit-tested); the daily cron prunes old counter rows. **Remaining:** extend the same limiter to the token-scoped RPCs `request_rental_history`, `onboard_submit`, `portal_submit_request` (call `rate_limit_touch` inside each SECURITY DEFINER RPC, keyed by token/uid). Login throttle itself is Supabase Auth **Attack Protection** (dashboard — see below).
- [x] **(build)** **Storage upload limits** — two layers. **Server (abuse gate):** every private bucket already enforces a `file_size_limit` (10–15 MB) + `allowed_mime_types` (`image/*`, or `image/*`+`application/pdf`), set in `20260929_storage_upload_limits.sql` (+ `inspection-reports` in `20260929_inspection_reports.sql`) — Storage rejects oversize/wrong-type uploads regardless of the client. **Client (UX + defence-in-depth):** new `lib/uploads` (`validateUpload`, `formatBytes`, `acceptAttr`, unit-tested) mirrors that config and now pre-checks **all 10 upload call-sites** (costs receipts, tenant documents ×2, onboarding docs, portal maintenance photos, compliance certificates, property photos, tenant resources, inspection-report photos), so a bad file is rejected instantly with a friendly message instead of a raw Storage API error.
- [ ] **(you)** Enable **leaked-password protection** (HaveIBeenPwned) in Supabase Auth → Passwords. *(May need Supabase Pro.)*
- [ ] **(you)** Email **confirmation ON** with working Resend SMTP (blocks fake/typo sign-ups).
- [ ] **(you)** Add **CAPTCHA / bot protection** on sign-up (Supabase Auth → Attack Protection).
- [ ] **(build/you)** Rate-limiting / abuse protection on public endpoints.
- [ ] **(you)** Supabase **Pro** for backups / PITR + remove any remaining advisor warnings (`pg_net` in public, function search_path).

### Billing (Section D — Stripe subscriptions)
- [ ] **(you)** Stripe account + create recurring **prices**: `STRIPE_PRICE_PLUS_MONTHLY` ($20), `_PLUS_ANNUAL` ($200), `_PRO_MONTHLY` ($45), `_PRO_ANNUAL` ($450).
- [ ] **(you)** Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`; webhook endpoint with `checkout.session.completed`, `customer.subscription.updated/deleted`, `account.updated`.
- [ ] **(you)** Enable **Stripe Connect (Express)** for landlord rent payouts; test in live mode.
- [ ] **(test)** Full billing test: upgrade Free→Plus→Pro, tier gates flip, downgrade/lapse falls back to Free.

### Legal & compliance
- [ ] **(build/you)** Terms of Service + Privacy Policy pages; cookie/consent if needed.
- [ ] **(build)** Confirm "not legal advice" disclaimers on all generated tenancy docs/AI drafts.
- [ ] **(you)** GST handling/registration once turnover approaches A$75k; decide GST-inclusive pricing display.

### Content & correctness
- [x] **(build)** Verified **all 8 states/territories'** bond caps + routine-inspection notice/frequency against each authority's published guidance (Sep 2026, incl. the 2024 QLD & WA reforms). Fixes: QLD bond note (the >$700/week exemption was abolished 30 Sep 2024 — now a flat 4 weeks); VIC bond threshold set to $900 with correct "one month / reasonable above $900" wording; WA note now states the $1,200 cap threshold + $350 pet bond; **TAS routine-inspection notice corrected to 24 hours (was wrongly 7–14 days)**; added an accurate per-year inspection cap for every state (NSW/QLD/SA/WA/NT = 4, VIC/ACT = 2) and made `maxNoticeDays` nullable since only SA sets a legislated notice *window* (7–28 days). These notes flow into the generated tenancy agreement. Still guidance, not legal advice — authority links included for confirmation.
- [ ] **(build)** Empty states, error states, and **mobile/responsive QA** across every page + the tenant portal.

### Quality & reliability
- [x] **(build)** **Timezone date correctness** — date helpers did local-calendar arithmetic but serialised with `toISOString()` (UTC), producing an **off-by-one for non-UTC users** (e.g. AU): `nextWeekdayDate`, SA `inspectionWindow`, `rentLedger.todayISO`, and every `today()` helper across the manager/portal UI. Added a single `toISODate(d)` (local calendar fields) in `lib/format` and routed all "today"/local-date call-sites through it; `account.deletionScheduledDate` deliberately stays UTC (its input is a UTC timestamp). Server-only handlers with no viewer TZ (Stripe webhook `received_date`) now use `operatingToday()` (Australia/Adelaide), matching the reminders cron, so online + manual "mark paid" stamp the same day. Suite made TZ-deterministic and verified green in UTC, Adelaide, LA and Kiritimati (+14); added `toISODate` unit tests (**122 tests**).
- [x] **(build)** **RLS tenant-delete fix** — `condition_reports`, `rental_history` (PR #18) and `inspection_reports` (PR #19) each had a single `FOR ALL` policy whose `USING` admitted the tenant/approved-share reader but whose `WITH CHECK` was org-only. Postgres checks only `USING` for `DELETE`, so a signed-in tenant could delete their own rows via the Supabase client (e.g. erase adverse rental history). Split each into an org-scoped `FOR ALL` + a read-only `SELECT` policy for the tenant/share paths. Applied live + `supabase/migrations/20260929_rls_tenant_readonly_fix.sql`.
- [x] **(build)** **Automated tests + CI** — Vitest unit suite (66 tests) over the pure business logic: SA inspection notice-window rules, the 8-state jurisdiction/bond-cap table, GST + financial-year maths, recurring-bill date projection, portfolio finance rollups, and the password policy. `gstComponent`/`financialYear` extracted to `src/lib/costs.ts` so they're testable. CI (`.github/workflows/ci.yml`) now runs **lint → typecheck → unit tests → build** on every PR and push to `main`. Next: component/integration tests and a smoke test of the token-guarded portal RPCs.

### Documents & requirements audit (see `docs/DOCUMENT-AUDIT.md`, 2026-09-28)
Full comparison of our forms/docs/requirements against established AU agency + authority practice, with sourced gaps. Priorities from that doc:
- [x] **(build) P1 — Compliance & safety register** — new **Compliance** tab: per-property smoke/gas/electrical/pool/blind-cord/min-standards items with editable cadence, last-done → auto next-due, provider, private certificate storage, "mark done today", and a status (Up to date / Due soon / Overdue). Due dates flow into the Management **calendar** + a **"Compliance & safety due"** dashboard tile. Per-state cadences still to be confirmed against the jurisdiction data.
- [x] **(build) P1 — Condition report issued/acknowledged tracking** + tenant portal **counter-sign**. Manager issues an ingoing/outgoing condition report (optional attached file) from the lease card; the tenant sees it in their portal and **acknowledges** it (typed name + optional disagreement note), which stamps `acknowledged_at`. Manager sees Acknowledged / Awaiting tenant status. `condition_reports` table + token-scoped `portal_acknowledge_condition_report` RPC; `portal_get` now returns the reports.
- [x] **(build) P1 — Pool/spa & strata + landlord legal identity.** Property form now captures **landlord legal name + service address (for notices)** and **has-pool / is-strata** flags. These flow into the generated tenancy agreement (Parties + a Premises strata/pool disclosure) and the tenant portal (landlord name + notice address, and a strata by-laws / pool-safety disclosure). Pool-safety recurring check is tracked in the Compliance register; by-laws are shared via Documents.
- [x] **(build) P2 — Rent ledger** view + export. Per-property printable ledger at `/app/rent-ledger/[id]` (linked from the property card's Rent ledger section): summary tiles (current balance, arrears, total received, next due), a full instalment table with a **running balance** + totals row, **CSV export** and **Print / Save PDF**. Arrears = unpaid instalments past their due date; balance = rent charged − received. Pure, unit-tested maths in `lib/rentLedger` (10 tests). Providable-on-request under AU tenancy law.
- [x] **(build) P2 — Routine inspection report** output. Manager records room-by-room findings (condition rating + notes + photos per area) from the lease card ("Inspection reports → New report"), with an overall condition (auto-suggested from the findings), summary and owner follow-up. Renders as a clean **printable page** (browser → Save as PDF) at `/app/inspection-report/[id]`; **Save & finalise** publishes it to the tenant's portal (read-only: findings + per-area photo counts; private photos never exposed to the portal). New `inspection_reports` table + private `inspection-reports` photo bucket (org-path isolated, images-only 10 MB), extended `portal_get`. Unit-tested helpers in `lib/inspectionReport`.
- [ ] **(build) P2 — Fuller lease clauses** (inclusions schedule, occupants, pets, water/utilities, safety, break-lease/assignment).
- [ ] **(build) P2 — Screening depth** (rent-to-income flag, credit/tenancy-database result field, structured reference-check capture).
- [ ] **(build) P2 — Arrears workflow** (reminder → breach → notice timeline).
- [ ] **(build) P3 — Agency-grade owner side** — management agreement, owner statements/disbursements, landlord insurance record, key register, disclosure statements.

### Launch review — reel notes (see `docs/LAUNCH-REVIEW.md`, 2026-09-29)
Deep-dive of the forwarded "vibe coding" reels: legal, security, paywall UX,
design anti-patterns, Apple App Store, stack. Full detail + real examples +
current status live in that doc. Net-new prioritised actions:
- [x] **(build)** **Security headers** in `next.config.ts` — CSP (default-src self; scripts/styles inline-only, no eval in prod; connect/img scoped to `*.supabase.co` + wss; `frame-ancestors 'none'`; `object-src 'none'`), HSTS (2y + includeSubDomains), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera/mic/geo/topics off), X-DNS-Prefetch-Control. Verified emitted on the running server. Phase-1 CSP keeps `'unsafe-inline'` scripts (Next injects inline bootstrap without nonces); tightening to nonce-based via middleware is a later step. **Verified live on prod (2026-09-29): securityheaders.com grade A**, all headers present; the only note is the expected phase-1 `'unsafe-inline'` on script-src.
- [ ] **(build/you)** **Confirm no secrets in git history**; rotate anything found.
- [x] **(build)** **Dependency scanning in CI** — CI runs `npm audit --omit=dev --audit-level=high` (blocking on high/critical in prod deps) + a non-blocking full-tree audit; `.github/dependabot.yml` opens weekly npm + github-actions update PRs (minor/patch grouped). Prod audit currently reports 0 vulns.
- [x] **(build)** **Self-serve account/data deletion** — Manager (owner) danger zone on the Team page: request deletion (type-org-name confirm) → org marked `deletion_requested_at` + signed out, **30-day grace** with a "Cancel deletion" button (recoverable). Tenants can request deletion of their tenancy data **only once the tenancy has ended** (portal "Your data" card → `portal_request_data_deletion`, gated on `status='ended'`, notifies the manager). Migration `20260929_account_deletion.sql` (org columns + `request_account_deletion`/`cancel_account_deletion`/`portal_request_data_deletion` RPCs + `tenant_data_deletion_requests` table); helpers in `lib/account` (unit-tested).
- [ ] **(build)** **Deletion purge job** (follow-up to the above) — a scheduled job to hard-delete orgs past the 30-day grace window. Needs an FK-safe ordered delete (or `ON DELETE CASCADE` on org FKs) + storage-object cleanup, run from the daily cron. Not urgent (no org can reach expiry for 30 days) and deliberately deferred rather than ship an untested mass-delete.
- [x] **(build)** **Unsubscribe link + sender identification** on non-transactional emails (Spam Act 2003). Every email now ends with a **sender-identity footer** (business name, site, optional `EMAIL_BUSINESS_ADDRESS`). Reminder ("notification") emails additionally carry a **self-serve unsubscribe**: an HMAC-signed link (`UNSUBSCRIBE_SECRET`) → public `/unsubscribe` confirm page (POST-only, so mail-client link prefetch can't opt anyone out) → `record_email_unsubscribe`; `/api/email` **skips suppressed recipients** for notification mail via `is_email_suppressed` (transactional mail — rent/notices — is never suppressed). If no secret is set, the footer falls back to a monitored reply-to opt-out. New `email_unsubscribes` table + RPCs (`supabase/migrations/20260929_email_unsubscribes.sql`, applied live); pure helpers `lib/emailFooter` + `lib/unsubscribeToken` (unit-tested). Also fixed a latent bug: the reminder **cron POSTed to `/api/email` with no auth header** (would 401 once configured) — it now sends `Authorization: Bearer <CRON_SECRET>`.
  - **Security hardening (2026-09-29, post-merge):** `record_email_unsubscribe` was initially left `anon`/`authenticated`-callable, so anyone with the public anon key could unsubscribe any address straight through the Supabase REST API, bypassing the HMAC check (which only ran in the Next route). Fixed: **EXECUTE revoked from anon/authenticated, kept for service_role only** (verified with `has_function_privilege`); `/api/unsubscribe` now verifies the token and writes with the **service-role client** rather than the anon client. Fails safe (error) if `SUPABASE_SERVICE_ROLE_KEY` is unset.
  - Follow-up (**done** 2026-09-30): `is_email_suppressed` (and `log_email`) were still anon-callable because `/api/email` reached them via the anon client. `/api/email` now runs both through the **service-role client** and their EXECUTE is revoked from anon/authenticated (`20260930_lock_internal_rpcs_followup.sql`). Suppression-status enumeration and forged `email_log` rows are both closed.
- [ ] **(build)** **Numeric rate limits** (emails/day, writes/min, uploads/account) + login throttle; **2FA/OTP** for managers (before public).
- [ ] **(build/you)** **Legal pack**: limitation-of-liability, governing law, indemnification, data-deletion, refund, cookie policy + consent banner; make policies match the real data map; add business details/ABN. Consider Termly/iubenda.
- [ ] **(build)** **Accessibility pass** (alt text, colour contrast, keyboard nav) — fold into the mobile/empty-state QA (#below).
- [ ] **(build)** **Paywall UX revamp** when billing is live — annual = primary/green with discount, trial gated to annual, lead with the outcome + savings, sell outcomes not features, per-line standalone cost, real reviews, 3-screen scrollable paywall, a polished checkout screen.
- [ ] **(build/you)** **Design pass vs. anti-patterns** + install design skills (Emil Kowalski / impeccable design / taste) + connect Figma MCP; ship the **logo reveal** (see below).
- [ ] **(you)** **Cyber liability insurance**; **read every stack's ToS** (Supabase/Vercel/Stripe/Resend/analytics) — feeds the privacy policy.
- [ ] **(build, if iOS)** Apple App Store readiness — IAP for digital subs, Sign in with Apple parity, in-app account deletion (incl. the SIWA path), no broken demo/iPad UI/screenshots, report + restore-purchases features. N/A while web-only.

### Growth & ops
- [ ] **(build)** Marketing / lead-capture site (public front to acquire clients).
- [ ] **(build)** Tenant **scheduled email reminders** (rent due) — server-side scheduled send (pg_cron/edge + email).
- [ ] **(build/you)** Error monitoring (e.g. Sentry) + uptime alerting.
- [ ] **(build/you)** Support channel + basic help docs for landlords and tenants.
- [ ] **(you)** `admin@corvelleproperty.com` mailbox live (MX) for inbound/support mail.

### Later product (not blocking public, but on the roadmap)
- [ ] **(build)** **Messaging assistant — text documents in, auto-filed.** A manager
  messages a bot (Telegram to start) with a photo/PDF + a line of text; the AI
  assistant reads it, classifies it (receipt → cost tracking with amount + GST +
  property; maintenance update → matter thread; contract/handbook → documents;
  etc.), files it in the software, and replies to confirm. Design:
  - **Transport:** a webhook endpoint (e.g. `/api/telegram`) receiving Bot API
    updates, verified by a secret token; downloads the attached file.
  - **Identity:** a one-time **link step** — the manager links their Telegram
    chat to their org (a code shown in-app), stored in a `messaging_links`
    table, so the bot only ever writes to that manager's org (never crosses
    isolation). Unlinked chats are rejected.
  - **Parsing:** Claude (vision) extracts fields + picks the destination; the
    file lands in the right private bucket and the right table via the existing
    server-side flows. Low-confidence → it asks a clarifying question instead of
    guessing.
  - **Prereqs (yours):** a Telegram bot token (BotFather), `ANTHROPIC_API_KEY`,
    and a public webhook (Vercel gives this). WhatsApp is possible later but
    needs a Business API/provider (Twilio/Meta) — heavier setup.
  - **Buildable now without the bot:** the same parse-and-file pipeline exposed
    inside the app's Assistant (drag a receipt in → it drafts the cost for you to
    confirm), then wire the Telegram transport on top once the token exists.
- [ ] **(build)** Development module (feasibility, stages, budgets, approvals).
- [ ] **(build)** Deeper investment analytics (cash-on-cash, gearing, portfolio trends).
- [ ] **(build)** Compliance schedule (recurring smoke-alarm/safety checks + reminders). → **now specified as P1 in `docs/DOCUMENT-AUDIT.md`.**
