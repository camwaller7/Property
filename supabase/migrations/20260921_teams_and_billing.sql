-- TEAMS + BILLING (applied to tioeqxdulxqiptlszldp on 2026-09-21; verified).
-- Data re-scoped from per-user (owner_id) to per-organization (org_id). Each
-- signup auto-creates an org (owner); members share the org's data. Billing
-- fields live on organizations.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My workspace',
  created_by uuid references auth.users(id) default auth.uid(),
  plan text not null default 'free',
  subscription_status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member',  -- owner | admin | member
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists org_members_user_idx on public.org_members(user_id);

create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  token text unique not null,
  email text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.properties          add column if not exists org_id uuid references public.organizations(id);
alter table public.payments            add column if not exists org_id uuid references public.organizations(id);
alter table public.tenancies           add column if not exists org_id uuid references public.organizations(id);
alter table public.inspections         add column if not exists org_id uuid references public.organizations(id);
alter table public.tenant_applications add column if not exists org_id uuid references public.organizations(id);
alter table public.notices             add column if not exists org_id uuid references public.organizations(id);
alter table public.portal_resources    add column if not exists org_id uuid references public.organizations(id);
alter table public.email_log           add column if not exists org_id uuid references public.organizations(id);

create or replace function public.my_org_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select org_id from public.org_members where user_id = auth.uid();
$$;
create or replace function public.is_org_member(p_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.org_members where org_id = p_org and user_id = auth.uid());
$$;
create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.org_members
                where org_id = p_org and user_id = auth.uid() and role in ('owner','admin'));
$$;
grant execute on function public.my_org_ids() to anon, authenticated;
grant execute on function public.is_org_member(uuid) to anon, authenticated;
grant execute on function public.is_org_admin(uuid) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  insert into public.organizations (name, created_by)
    values (coalesce(nullif(split_part(new.email,'@',1),''),'My') || '''s workspace', new.id)
    returning id into v_org;
  insert into public.org_members (org_id, user_id, email, role)
    values (v_org, new.id, new.email, 'owner');
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_org_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.org_id is null then
    new.org_id := (select org_id from public.org_members
                   where user_id = auth.uid() order by created_at limit 1);
  end if;
  return new;
end; $$;
do $$
declare t text;
begin
  foreach t in array array['properties','payments','tenancies','inspections',
                           'tenant_applications','notices','portal_resources','email_log']
  loop
    execute format('drop trigger if exists set_org_id_trg on public.%I', t);
    execute format('create trigger set_org_id_trg before insert on public.%I
                    for each row execute function public.set_org_id()', t);
  end loop;
end $$;

create or replace function public.accept_invite(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_inv public.org_invites; v_email text;
begin
  select * into v_inv from public.org_invites where token = p_token;
  if not found then return jsonb_build_object('error','not_found'); end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.org_members (org_id, user_id, email, role)
    values (v_inv.org_id, auth.uid(), v_email, v_inv.role)
    on conflict (org_id, user_id) do nothing;
  update public.org_invites set accepted_at = now() where id = v_inv.id and accepted_at is null;
  return jsonb_build_object('ok', true,
    'org', (select name from public.organizations where id = v_inv.org_id));
end; $$;
grant execute on function public.accept_invite(text) to authenticated;

alter table public.organizations enable row level security;
alter table public.org_members  enable row level security;
alter table public.org_invites  enable row level security;

create policy organizations_select on public.organizations for select to authenticated using (public.is_org_member(id));
create policy organizations_update on public.organizations for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));
create policy org_members_select on public.org_members for select to authenticated using (public.is_org_member(org_id));
create policy org_members_admin  on public.org_members for all to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy org_invites_admin  on public.org_invites for all to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

drop policy if exists properties_owner          on public.properties;
drop policy if exists payments_owner            on public.payments;
drop policy if exists tenancies_owner           on public.tenancies;
drop policy if exists inspections_owner         on public.inspections;
drop policy if exists tenant_applications_owner on public.tenant_applications;
drop policy if exists notices_owner             on public.notices;
drop policy if exists portal_resources_owner    on public.portal_resources;
drop policy if exists email_log_owner           on public.email_log;

create policy properties_org          on public.properties          for all to authenticated using (org_id in (select public.my_org_ids())) with check (org_id in (select public.my_org_ids()));
create policy payments_org            on public.payments            for all to authenticated using (org_id in (select public.my_org_ids())) with check (org_id in (select public.my_org_ids()));
create policy tenancies_org           on public.tenancies           for all to authenticated using (org_id in (select public.my_org_ids())) with check (org_id in (select public.my_org_ids()));
create policy inspections_org         on public.inspections         for all to authenticated using (org_id in (select public.my_org_ids())) with check (org_id in (select public.my_org_ids()));
create policy tenant_applications_org on public.tenant_applications for all to authenticated using (org_id in (select public.my_org_ids())) with check (org_id in (select public.my_org_ids()));
create policy notices_org             on public.notices             for all to authenticated using (org_id in (select public.my_org_ids())) with check (org_id in (select public.my_org_ids()));
create policy portal_resources_org    on public.portal_resources    for all to authenticated using (org_id in (select public.my_org_ids())) with check (org_id in (select public.my_org_ids()));
create policy email_log_org           on public.email_log           for all to authenticated using (org_id in (select public.my_org_ids())) with check (org_id in (select public.my_org_ids()));

create or replace function public.log_email(p_tenancy_id uuid, p_to text, p_subject text,
  p_body text, p_status text, p_error text)
returns void language sql security definer set search_path = public as $$
  insert into public.email_log (tenancy_id, to_email, subject, body, status, error, owner_id, org_id)
  values (p_tenancy_id, p_to, p_subject, p_body, p_status, p_error,
          (select owner_id from public.tenancies where id = p_tenancy_id),
          (select org_id   from public.tenancies where id = p_tenancy_id));
$$;
