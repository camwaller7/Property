-- Numeric rate limiting (per-token / per-IP volume throttle). The auth gate on
-- the public endpoints is already in place; this is the remaining layer that
-- caps *how many* calls an authorised caller can make in a window.
--
-- Fixed-window counter: one row per (bucket, window_start). rate_limit_touch
-- atomically increments the current window's count and returns whether the
-- caller is still under the limit. SECURITY DEFINER + service_role-only EXECUTE:
-- the key is always derived server-side (in the API route or a SECURITY DEFINER
-- RPC), never supplied by an untrusted client, so it can't be used to
-- pre-exhaust a victim's bucket.

create table if not exists public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
-- No policies: reached only via rate_limit_touch (SECURITY DEFINER) or the
-- service role (which bypasses RLS, e.g. the daily cleanup in the cron).

create or replace function public.rate_limit_touch(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_hits int;
begin
  -- Misconfigured limits never block a legitimate request.
  if p_key is null or length(p_key) = 0 or p_max is null or p_max <= 0
     or p_window_seconds is null or p_window_seconds <= 0 then
    return true;
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits (bucket, window_start, hits)
    values (p_key, v_window, 1)
    on conflict (bucket, window_start)
    do update set hits = public.rate_limits.hits + 1
    returning hits into v_hits;

  return v_hits <= p_max;
end;
$$;

revoke all on function public.rate_limit_touch(text, int, int) from public;
grant execute on function public.rate_limit_touch(text, int, int) to service_role;
