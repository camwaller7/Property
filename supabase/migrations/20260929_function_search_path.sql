-- Security hardening (advisors 2026-09-29): pin search_path on the two flagged
-- functions so they can't be influenced by a caller's role search_path, and
-- document that inspection_reminders_sent is intentionally deny-all under RLS
-- (written only by the reminder cron via the service role; never read by the
-- client). Applied to project tioeqxdulxqiptlszldp 2026-09-29.

alter function public.app_base_url() set search_path = public;
alter function public.render_notification_email(text, text, text, text, text[], text, text, text)
  set search_path = public;

comment on table public.inspection_reminders_sent is
  'Dedup log for the inspection reminder cron. RLS enabled with no policy = deny-all to anon/authenticated by design; only the service-role cron writes to it.';
