-- Tenant portal accounts. Tenants get real Supabase Auth accounts (separate
-- from managers) linked to their tenancy, so they can log in from the landing
-- page rather than only via a token link.
--
-- Model: the portal link a manager sends becomes a "create account" page. The
-- signup carries user metadata { role: 'tenant', portal_token: '<token>' }.
-- handle_new_user is made role-aware: a tenant signup is linked to its tenancy
-- (via the portal_token) in tenant_portal_users and does NOT get a manager org;
-- a normal signup keeps the existing behaviour (new org + owner membership).
-- Applied to project tioeqxdulxqiptlszldp 2026-09-24.

create table if not exists public.tenant_portal_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  tenancy_id  uuid references public.tenancies(id) on delete cascade,
  org_id      uuid references public.organizations(id),
  email       text,
  created_at  timestamptz not null default now()
);
create index if not exists tenant_portal_users_tenancy_idx on public.tenant_portal_users(tenancy_id);
create index if not exists tenant_portal_users_org_idx on public.tenant_portal_users(org_id);

alter table public.tenant_portal_users enable row level security;

-- A tenant can read their own link; a manager can read links for their org.
drop policy if exists tenant_portal_users_self on public.tenant_portal_users;
create policy tenant_portal_users_self on public.tenant_portal_users
  for select to authenticated
  using (user_id = auth.uid() or org_id in (select public.my_org_ids()));

-- Role-aware signup handler.
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_org uuid;
  v_role text := new.raw_user_meta_data->>'role';
  v_token text := new.raw_user_meta_data->>'portal_token';
  v_tenancy uuid;
  v_tenancy_org uuid;
begin
  if v_role = 'tenant' then
    -- Link the tenant account to its tenancy via the portal token. No org is
    -- created for tenants. If the token doesn't match, the account still exists
    -- but stays unlinked (the portal will ask them to contact their manager).
    if v_token is not null then
      select t.id, t.org_id into v_tenancy, v_tenancy_org
        from public.tenancies t where t.portal_token = v_token limit 1;
      if v_tenancy is not null then
        insert into public.tenant_portal_users (user_id, tenancy_id, org_id, email)
          values (new.id, v_tenancy, v_tenancy_org, new.email)
          on conflict (user_id) do nothing;
      end if;
    end if;
    return new;
  end if;

  -- Default (manager) signup: create a workspace + owner membership.
  insert into public.organizations (name, created_by)
    values (coalesce(nullif(split_part(new.email,'@',1),''),'My') || '''s workspace', new.id)
    returning id into v_org;
  insert into public.org_members (org_id, user_id, email, role)
    values (v_org, new.id, new.email, 'owner');
  return new;
end; $function$;

-- Resolve the authenticated tenant's portal token (so the tenant portal can
-- reuse the existing token-scoped portal_get RPC). SECURITY DEFINER: reads only
-- the caller's own link + its tenancy's token.
create or replace function public.tenant_portal_token()
 returns text
 language sql
 security definer
 set search_path to 'public'
as $function$
  select t.portal_token
  from public.tenant_portal_users tpu
  join public.tenancies t on t.id = tpu.tenancy_id
  where tpu.user_id = auth.uid()
  limit 1;
$function$;

revoke all on function public.tenant_portal_token() from public;
grant execute on function public.tenant_portal_token() to authenticated;
