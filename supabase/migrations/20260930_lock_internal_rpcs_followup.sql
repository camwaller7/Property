-- Security hardening follow-up (Supabase security advisors) — completes
-- 20260929_lock_down_internal_rpcs.sql. That pass deliberately left three
-- functions callable by anon/authenticated because the app reached them through
-- the anon PostgREST client:
--   * log_email            — /api/email logged sends via the anon client
--   * is_email_suppressed  — /api/email checked opt-outs via the anon client
--   * generate_rent_schedule — the signed-in manager client calls it (saveTenancy)
--
-- /api/email now routes log_email + is_email_suppressed through the service-role
-- client, so anon/authenticated EXECUTE can be revoked (service_role only):
--   * log_email — anon-callable let anyone with the public anon key inject
--     arbitrary rows into email_log (owner_id/org_id are derived from the
--     tenancy, so rows could be forged against any tenancy).
--   * is_email_suppressed — anon-callable allowed unsubscribe-status enumeration
--     (probe whether any address had opted out).
--
-- generate_rent_schedule stays callable by signed-in managers (the client calls
-- it inline after creating a tenancy), but was missing an org check: as a
-- SECURITY DEFINER function it filtered on p_org without verifying the caller
-- belongs to that org, so an authenticated user could insert rent rows into
-- another org's payments (or, with p_org null, every org's). It now self-checks:
-- a signed-in caller may only target an org they belong to; the trusted server
-- path (run_daily -> generate_rent_schedule() as service_role, auth.uid() null)
-- keeps working, including the p_org null "all orgs" maintenance sweep.
--
-- Applied to project tioeqxdulxqiptlszldp 2026-09-30.

create or replace function public.generate_rent_schedule(p_org uuid default null::uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare t record; anchor date; step interval; amt numeric; d date; horizon date := current_date + 14;
begin
  -- A signed-in caller (auth.uid() present) may only generate for an org they
  -- belong to. Service-role/cron callers (run_daily) have no user context
  -- (auth.uid() null) and retain the p_org null "all orgs" sweep.
  if auth.uid() is not null then
    if p_org is null or p_org not in (select public.my_org_ids()) then
      raise exception 'not authorised to generate a rent schedule for this org';
    end if;
  end if;

  for t in
    select * from public.tenancies
    where status in ('upcoming','active') and weekly_rent is not null and property_id is not null
      and (p_org is null or org_id = p_org)
  loop
    anchor := coalesce(t.lease_start, t.move_in_date);
    if anchor is null then continue; end if;
    step := case t.rent_frequency when 'fortnightly' then interval '14 days'
                                  when 'monthly' then interval '1 month'
                                  else interval '7 days' end;
    amt := case t.rent_frequency when 'fortnightly' then t.weekly_rent * 2
                                 when 'monthly' then round(t.weekly_rent * 52 / 12)
                                 else t.weekly_rent end;
    d := anchor;
    -- Skip forward so we only create ~1 month of history + the horizon.
    while d < current_date - 31 loop d := (d + step)::date; end loop;
    while d <= horizon loop
      if not exists (select 1 from public.payments where property_id = t.property_id and due_date = d) then
        insert into public.payments (property_id, due_date, amount, status, org_id, owner_id)
        values (t.property_id, d, amt, 'due', t.org_id, t.owner_id);
      end if;
      d := (d + step)::date;
    end loop;
  end loop;
end; $function$;

-- CREATE OR REPLACE keeps the existing ACL; re-assert the anon revoke to be safe.
revoke execute on function public.generate_rent_schedule(uuid) from anon;

-- Now service-role-only: /api/email calls these via the service-role client.
revoke execute on function public.log_email(uuid, text, text, text, text, text) from anon, authenticated;
revoke execute on function public.is_email_suppressed(text) from anon, authenticated;

-- Correct rate_limit_touch's grants. 20260930_rate_limits.sql intended it to be
-- service-role-only, but its `revoke ... from public` did not remove the *direct*
-- EXECUTE grants Supabase's default privileges give anon/authenticated on new
-- public functions, so it stayed callable over PostgREST. That let an attacker
-- call it with a victim's key (or arbitrary p_max) to exhaust that principal's
-- window and 429 their legitimate sends — the bucket-poisoning the RPC was
-- meant to prevent by being server-only. The app only ever calls it via the
-- service-role client, so revoking anon/authenticated is safe.
revoke execute on function public.rate_limit_touch(text, integer, integer) from anon, authenticated;

-- Document the intentional deny-all on the service-role-only tables (RLS on,
-- no policy → no anon/authenticated access; only the service role reaches them).
-- Silences the advisors' "RLS enabled, no policy" INFO for tables that are
-- meant to be unreachable by the public API.
comment on table public.rate_limits is
  'Service-role only. RLS on with no policy = deny-all for anon/authenticated; written solely via rate_limit_touch (SECURITY DEFINER) and the reminders cron.';
comment on table public.email_unsubscribes is
  'Service-role only. RLS on with no policy = deny-all for anon/authenticated; written via record_email_unsubscribe / read via is_email_suppressed (both SECURITY DEFINER, service-role EXECUTE).';
comment on table public.inspection_reminders_sent is
  'Service-role only. RLS on with no policy = deny-all for anon/authenticated; written solely by the reminders cron (service role).';
