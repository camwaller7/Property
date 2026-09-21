-- RENT AUTOMATION (applied to tioeqxdulxqiptlszldp 2026-09-21; chain verified).
-- Auto-generate the expected rent schedule from the lease + frequency, auto-mark
-- overdue rent 'late', and a reconcile_payment hook for bank-feed / payment-rail
-- integration. Daily via pg_cron ('daily-ops' -> run_daily -> schedule + overdue
-- + reminders). See the applied migration record for full function bodies.

alter table public.tenancies add column if not exists rent_frequency text not null default 'weekly';
  -- weekly | fortnightly | monthly

-- generate_rent_schedule(p_org uuid default null): creates expected payment rows
--   (~1 month history + 2 weeks ahead), deduped by (property, due_date).
-- mark_overdue(p_org uuid default null): due + unpaid + past due -> 'late'.
-- reconcile_payment(property, amount, date, reference): matches an incoming
--   deposit (2% amount tolerance) to the earliest unpaid rent and marks it
--   paid/late; org-guarded for signed-in callers, open to the service role for
--   automated feeds.
-- run_daily(): generate_rent_schedule() + mark_overdue() + generate_reminders();
--   scheduled daily at 22:00 UTC via pg_cron job 'daily-ops'.
