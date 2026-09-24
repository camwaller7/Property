-- De-dup log for automatic inspection reminder emails. The daily cron
-- (/api/cron/reminders) sends a reminder 30 / 14 / 3 days before each scheduled
-- inspection and records it here so the same reminder never sends twice.
-- Written only by the service role (cron); RLS on with no policy denies all
-- normal (anon/authenticated) access. Applied to tioeqxdulxqiptlszldp 2026-09-24.

create table if not exists public.inspection_reminders_sent (
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  days_before   int  not null,
  sent_at       timestamptz not null default now(),
  primary key (inspection_id, days_before)
);

alter table public.inspection_reminders_sent enable row level security;
-- No policy: only the service role (which bypasses RLS) may read/write.
