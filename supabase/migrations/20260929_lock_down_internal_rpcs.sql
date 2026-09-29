-- Security hardening (from Supabase security advisors, 2026-09-29).
-- These SECURITY DEFINER functions are internal helpers invoked only by
-- triggers, cron (service role), or other definer functions — never directly
-- by the browser client. Being callable by anon/authenticated over PostgREST
-- was an abuse surface (arbitrary email sends via notify_manager, owner-email
-- enumeration via get_org_owner_email, spurious notifications, etc.). Revoke
-- EXECUTE from anon + authenticated; trigger/cron/definer callers are
-- unaffected because they run as the function owner.
--
-- Deliberately NOT revoked:
--  * log_email — called by /api/email (anon client) until SUPABASE_SERVICE_ROLE_KEY is set.
--  * generate_rent_schedule — called by the authenticated client (saveTenancy);
--    only anon is revoked here.
-- Verified against src/ that none of the revoked functions are called by the app.
-- Applied to project tioeqxdulxqiptlszldp 2026-09-29.

revoke execute on function public.app_base_url() from anon, authenticated;
revoke execute on function public.check_upcoming_notifications() from anon, authenticated;
revoke execute on function public.get_org_owner_email(uuid) from anon, authenticated;
revoke execute on function public.mark_overdue(uuid) from anon, authenticated;
revoke execute on function public.notify_manager(text, text, text, text) from anon, authenticated;
revoke execute on function public.notify_manager(text, text, text, text, text) from anon, authenticated;
revoke execute on function public.notify_new_maintenance_request() from anon, authenticated;
revoke execute on function public.reconcile_payment(uuid, numeric, date, text) from anon, authenticated;
revoke execute on function public.render_notification_email(text, text, text, text, text[], text, text, text) from anon, authenticated;

-- generate_rent_schedule stays callable by signed-in managers (the app calls it),
-- but should never be reachable anonymously.
revoke execute on function public.generate_rent_schedule(uuid) from anon;
