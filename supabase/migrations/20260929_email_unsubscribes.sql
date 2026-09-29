-- Email unsubscribe suppression list (AU Spam Act 2003 — a functional
-- unsubscribe facility for non-transactional "notification" mail, e.g. the
-- inspection-reminder emails sent by the daily cron).
--
-- Trust model: the unsubscribe link is HMAC-signed with a server-only secret
-- (UNSUBSCRIBE_SECRET) and verified in /api/unsubscribe BEFORE this RPC is
-- called, exactly like the token-guarded portal RPCs. The table itself is
-- reached only through the SECURITY DEFINER functions below (RLS on, no direct
-- policies). record_email_unsubscribe is idempotent and only ever *adds* a
-- suppression (never reveals data), and suppression is applied only to
-- notification-category mail — it can never block a transactional message
-- (rent, legal notices, a manager writing to their tenant).

create table if not exists public.email_unsubscribes (
  email text primary key,
  created_at timestamptz not null default now(),
  source text
);

alter table public.email_unsubscribes enable row level security;
-- No direct policies: only the SECURITY DEFINER RPCs below may touch this table.

create or replace function public.record_email_unsubscribe(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_email is null or length(trim(p_email)) = 0 then
    return;
  end if;
  insert into public.email_unsubscribes (email, source)
  values (lower(trim(p_email)), 'link')
  on conflict (email) do nothing;
end;
$$;

create or replace function public.is_email_suppressed(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.email_unsubscribes
    where email = lower(trim(coalesce(p_email, '')))
  );
$$;

-- Both RPCs are reachable by unauthenticated callers by design (the unsubscribe
-- page and the send path both run as anon), gated by the HMAC check in the app
-- layer.
revoke all on function public.record_email_unsubscribe(text) from public;
grant execute on function public.record_email_unsubscribe(text) to anon, authenticated, service_role;

revoke all on function public.is_email_suppressed(text) from public;
grant execute on function public.is_email_suppressed(text) to anon, authenticated, service_role;
