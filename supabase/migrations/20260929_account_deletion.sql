-- Self-serve data deletion (docs/LAUNCH-REVIEW.md §4/§5).
--
-- Manager (org owner): requests account deletion → the org is marked with
-- deletion_requested_at and the manager is signed out. A 30-day grace window
-- lets them cancel (recoverable). After the window a purge removes the org's
-- data (the purge job itself is a documented follow-up — see TODO — since no
-- org can reach expiry for 30 days and an untested mass-delete is risky).
--
-- Tenant: may request deletion of their tenancy data ONLY once the tenancy has
-- ended. The request is routed to the manager (who still controls records they
-- are legally required to keep), recorded, and raised as a notification.
-- Applied to project tioeqxdulxqiptlszldp 2026-09-29.

-- Manager account-deletion state ---------------------------------------------
alter table public.organizations
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_requested_by uuid;

-- Owner requests deletion of their org. Owner-only; stamps the request.
create or replace function public.request_account_deletion()
 returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select om.org_id into v_org
    from public.org_members om
   where om.user_id = auth.uid() and om.role = 'owner'
   limit 1;
  if v_org is null then return jsonb_build_object('error', 'not_owner'); end if;
  update public.organizations
     set deletion_requested_at = now(), deletion_requested_by = auth.uid()
   where id = v_org;
  return jsonb_build_object('ok', true, 'scheduled_for', (now() + interval '30 days'));
end; $$;
grant execute on function public.request_account_deletion() to authenticated;

-- Owner cancels a pending deletion within the grace window.
create or replace function public.cancel_account_deletion()
 returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select om.org_id into v_org
    from public.org_members om
   where om.user_id = auth.uid() and om.role = 'owner'
   limit 1;
  if v_org is null then return jsonb_build_object('error', 'not_owner'); end if;
  update public.organizations
     set deletion_requested_at = null, deletion_requested_by = null
   where id = v_org;
  return jsonb_build_object('ok', true);
end; $$;
grant execute on function public.cancel_account_deletion() to authenticated;

-- Tenant data-deletion requests ----------------------------------------------
create table if not exists public.tenant_data_deletion_requests (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references public.organizations(id),
  tenancy_id     uuid references public.tenancies(id) on delete cascade,
  tenant_user_id uuid,
  note           text,
  status         text not null default 'pending', -- pending | actioned | declined
  requested_at   timestamptz not null default now(),
  actioned_at    timestamptz
);
create index if not exists tddr_org_idx on public.tenant_data_deletion_requests(org_id);

alter table public.tenant_data_deletion_requests enable row level security;
-- Managers manage their org's requests; the linked tenant may read their own.
drop policy if exists tddr_org on public.tenant_data_deletion_requests;
create policy tddr_org on public.tenant_data_deletion_requests
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));
drop policy if exists tddr_tenant_read on public.tenant_data_deletion_requests;
create policy tddr_tenant_read on public.tenant_data_deletion_requests
  for select to authenticated
  using (tenancy_id in (select tpu.tenancy_id from public.tenant_portal_users tpu where tpu.user_id = auth.uid()));

-- Tenant requests deletion of their tenancy data — only for an ENDED tenancy.
-- Token-scoped like the other portal RPCs; records the request + notifies the
-- manager. Deduplicates on an existing pending request.
create or replace function public.portal_request_data_deletion(p_token text, p_note text)
 returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ten public.tenancies; v_exists uuid;
begin
  select * into v_ten from public.tenancies where portal_token = p_token;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if v_ten.status <> 'ended' then
    return jsonb_build_object('error', 'tenancy_active');
  end if;
  select id into v_exists from public.tenant_data_deletion_requests
    where tenancy_id = v_ten.id and status = 'pending' limit 1;
  if v_exists is not null then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  insert into public.tenant_data_deletion_requests (org_id, tenancy_id, note)
    values (v_ten.org_id, v_ten.id, nullif(trim(p_note), ''));
  insert into public.notifications (org_id, type, title, body, entity_id)
    values (v_ten.org_id, 'data_deletion_request',
      'Tenant data-deletion request',
      coalesce(v_ten.tenant_name, 'A past tenant') || ' has requested deletion of their tenancy data.',
      v_ten.id);
  return jsonb_build_object('ok', true);
end; $$;
grant execute on function public.portal_request_data_deletion(text, text) to anon, authenticated;
