-- MULTI-TENANT: each account sees only its own data (applied to
-- tioeqxdulxqiptlszldp on 2026-09-21; isolation verified server-side).
-- owner_id defaults to the signed-in user's id, so existing client inserts need
-- no change. RLS switches from authenticated->true to owner = auth.uid().

alter table public.properties          add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table public.payments            add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table public.tenancies           add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table public.inspections         add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table public.tenant_applications add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table public.notices             add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table public.portal_resources    add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table public.email_log           add column if not exists owner_id uuid references auth.users(id) default auth.uid();

create index if not exists properties_owner_idx          on public.properties(owner_id);
create index if not exists payments_owner_idx            on public.payments(owner_id);
create index if not exists tenancies_owner_idx           on public.tenancies(owner_id);
create index if not exists inspections_owner_idx         on public.inspections(owner_id);
create index if not exists tenant_applications_owner_idx on public.tenant_applications(owner_id);
create index if not exists notices_owner_idx             on public.notices(owner_id);
create index if not exists portal_resources_owner_idx    on public.portal_resources(owner_id);
create index if not exists email_log_owner_idx           on public.email_log(owner_id);

drop policy if exists properties_auth_all          on public.properties;
drop policy if exists payments_auth_all            on public.payments;
drop policy if exists tenancies_auth_all           on public.tenancies;
drop policy if exists inspections_auth_all         on public.inspections;
drop policy if exists tenant_applications_auth_all on public.tenant_applications;
drop policy if exists notices_auth_all             on public.notices;
drop policy if exists portal_resources_auth_all    on public.portal_resources;
drop policy if exists email_log_auth_all           on public.email_log;

create policy properties_owner          on public.properties          for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy payments_owner            on public.payments            for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy tenancies_owner           on public.tenancies           for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy inspections_owner         on public.inspections         for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy tenant_applications_owner on public.tenant_applications for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy notices_owner             on public.notices             for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy portal_resources_owner    on public.portal_resources    for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy email_log_owner           on public.email_log           for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Email log written from the server route (anon): stamp owner from the tenancy.
create or replace function public.log_email(p_tenancy_id uuid, p_to text, p_subject text,
  p_body text, p_status text, p_error text)
returns void language sql security definer set search_path = public as $$
  insert into public.email_log (tenancy_id, to_email, subject, body, status, error, owner_id)
  values (p_tenancy_id, p_to, p_subject, p_body, p_status, p_error,
          (select owner_id from public.tenancies where id = p_tenancy_id));
$$;
