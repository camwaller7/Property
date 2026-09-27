-- Portable rental history — consented cross-manager sharing.
--
-- A tenant already reads their own rental_history across every managing org
-- (the rental_history_access policy). This adds the missing half: a NEW property
-- manager can request read access to a prospective tenant's history by the
-- tenant's email; the tenant approves (or declines) in their portal, and only
-- then does that one requesting org get read-only access. Consent is explicit,
-- per-org, and revocable — the only path across org isolation for this data.
-- Applied to project tioeqxdulxqiptlszldp 2026-09-27.

create table if not exists public.rental_history_shares (
  id               uuid primary key default gen_random_uuid(),
  tenant_user_id   uuid not null references auth.users(id) on delete cascade,
  requester_org_id uuid not null references public.organizations(id) on delete cascade,
  requested_by     uuid references auth.users(id) on delete set null,
  tenant_email     text,
  status           text not null default 'pending'
                     check (status in ('pending','approved','declined','revoked')),
  created_at       timestamptz not null default now(),
  responded_at     timestamptz,
  unique (tenant_user_id, requester_org_id)
);
create index if not exists rhs_tenant_idx on public.rental_history_shares(tenant_user_id);
create index if not exists rhs_org_idx on public.rental_history_shares(requester_org_id);

alter table public.rental_history_shares enable row level security;

-- The tenant sees requests addressed to them; a manager sees requests their org
-- made. Writes go through the SECURITY DEFINER RPCs below, not direct DML.
drop policy if exists rhs_visible on public.rental_history_shares;
create policy rhs_visible on public.rental_history_shares
  for select to authenticated
  using (tenant_user_id = auth.uid() or requester_org_id in (select public.my_org_ids()));

-- Extend rental_history reads: a requesting org may read a tenant's history once
-- that tenant has an APPROVED share for that org.
drop policy if exists rental_history_access on public.rental_history;
create policy rental_history_access on public.rental_history
  for all to authenticated
  using (
    org_id in (select public.my_org_ids())
    or tenant_user_id = auth.uid()
    or exists (
      select 1 from public.rental_history_shares s
      where s.tenant_user_id = rental_history.tenant_user_id
        and s.requester_org_id in (select public.my_org_ids())
        and s.status = 'approved'
    )
  )
  with check (org_id in (select public.my_org_ids()));

-- A manager requests a tenant's history by email. Creates a pending share for
-- the caller's org. Resolves the tenant by their portal-account email.
create or replace function public.request_rental_history(p_tenant_email text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_org    uuid;
  v_tenant uuid;
  v_id     uuid;
  v_status text;
begin
  select org_id into v_org from public.org_members
    where user_id = auth.uid() order by created_at limit 1;
  if v_org is null then
    return jsonb_build_object('error', 'not_a_manager');
  end if;

  select user_id into v_tenant from public.tenant_portal_users
    where lower(email) = lower(btrim(p_tenant_email)) limit 1;
  if v_tenant is null then
    return jsonb_build_object('error', 'tenant_not_found');
  end if;

  -- Reuse an existing row (re-request after a decline flips it back to pending).
  select id, status into v_id, v_status from public.rental_history_shares
    where tenant_user_id = v_tenant and requester_org_id = v_org;
  if v_id is not null then
    if v_status in ('declined','revoked') then
      update public.rental_history_shares
        set status = 'pending', requested_by = auth.uid(),
            tenant_email = btrim(p_tenant_email), created_at = now(), responded_at = null
        where id = v_id;
    end if;
    return jsonb_build_object('ok', true, 'share_id', v_id, 'status',
      (select status from public.rental_history_shares where id = v_id));
  end if;

  insert into public.rental_history_shares (tenant_user_id, requester_org_id, requested_by, tenant_email)
    values (v_tenant, v_org, auth.uid(), btrim(p_tenant_email))
    returning id into v_id;
  return jsonb_build_object('ok', true, 'share_id', v_id, 'status', 'pending');
end $function$;

-- The tenant approves or declines a request addressed to them.
create or replace function public.respond_rental_history_share(p_share_id uuid, p_approve boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_owner uuid;
begin
  select tenant_user_id into v_owner from public.rental_history_shares where id = p_share_id;
  if v_owner is null then
    return jsonb_build_object('error', 'not_found');
  end if;
  if v_owner <> auth.uid() then
    return jsonb_build_object('error', 'not_authorised');
  end if;
  update public.rental_history_shares
    set status = case when p_approve then 'approved' else 'declined' end,
        responded_at = now()
    where id = p_share_id;
  return jsonb_build_object('ok', true);
end $function$;

-- The tenant revokes an approved share (or a manager withdraws their request).
create or replace function public.revoke_rental_history_share(p_share_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_owner uuid;
  v_org   uuid;
begin
  select tenant_user_id, requester_org_id into v_owner, v_org
    from public.rental_history_shares where id = p_share_id;
  if v_owner is null then
    return jsonb_build_object('error', 'not_found');
  end if;
  if v_owner <> auth.uid() and not (v_org in (select public.my_org_ids())) then
    return jsonb_build_object('error', 'not_authorised');
  end if;
  update public.rental_history_shares
    set status = 'revoked', responded_at = now()
    where id = p_share_id;
  return jsonb_build_object('ok', true);
end $function$;

-- Manager view: approved shares with each tenant's history rows.
create or replace function public.shared_rental_histories()
 returns jsonb
 language sql
 security definer
 set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'share_id', s.id,
    'tenant_email', s.tenant_email,
    'approved_at', s.responded_at,
    'history', coalesce((select jsonb_agg(to_jsonb(rh) order by rh.ended_on desc nulls last)
      from public.rental_history rh where rh.tenant_user_id = s.tenant_user_id), '[]'::jsonb)
  ) order by s.responded_at desc nulls last), '[]'::jsonb)
  from public.rental_history_shares s
  where s.status = 'approved'
    and s.requester_org_id in (select public.my_org_ids());
$function$;

-- Tenant view: their own sharing requests, with the requesting org's name
-- (tenants can't read the organizations table directly).
create or replace function public.my_rental_history_shares()
 returns jsonb
 language sql
 security definer
 set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'status', s.status,
    'created_at', s.created_at,
    'responded_at', s.responded_at,
    'org_name', (select o.name from public.organizations o where o.id = s.requester_org_id)
  ) order by s.created_at desc), '[]'::jsonb)
  from public.rental_history_shares s
  where s.tenant_user_id = auth.uid();
$function$;

revoke all on function public.request_rental_history(text) from public;
revoke all on function public.my_rental_history_shares() from public;
grant execute on function public.my_rental_history_shares() to authenticated;
revoke all on function public.respond_rental_history_share(uuid, boolean) from public;
revoke all on function public.revoke_rental_history_share(uuid) from public;
revoke all on function public.shared_rental_histories() from public;
grant execute on function public.request_rental_history(text) to authenticated;
grant execute on function public.respond_rental_history_share(uuid, boolean) to authenticated;
grant execute on function public.revoke_rental_history_share(uuid) to authenticated;
grant execute on function public.shared_rental_histories() to authenticated;
