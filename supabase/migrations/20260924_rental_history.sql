-- Lease lifecycle: ended tenancies + tenant-owned rental history.
-- When a manager ends a tenancy (or its lease_end passes), the tenant portal
-- stops showing live details and shows a past-tenancy record instead. A
-- rental_history row captures a snapshot at end time. It is readable by the
-- managing org AND by the linked tenant's own account (tenant_user_id), which
-- is the foundation for portable, cross-manager rental history (later stage).
-- Applied to project tioeqxdulxqiptlszldp 2026-09-24.

alter table public.tenancies add column if not exists ended_at timestamptz;

create table if not exists public.rental_history (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid references public.organizations(id),
  tenancy_id       uuid references public.tenancies(id) on delete set null,
  property_id      uuid references public.properties(id) on delete set null,
  tenant_user_id   uuid references auth.users(id) on delete set null,
  property_address text,
  tenant_name      text,
  lease_start      date,
  lease_end        date,
  ended_on         date,
  weekly_rent      numeric,
  rent_frequency   text,
  bond_amount      numeric,
  conduct_note     text,   -- manager's reference summary (curated, shareable)
  created_at       timestamptz not null default now()
);
create index if not exists rental_history_org_idx on public.rental_history(org_id);
create index if not exists rental_history_tenant_idx on public.rental_history(tenant_user_id);
create index if not exists rental_history_tenancy_idx on public.rental_history(tenancy_id);

alter table public.rental_history enable row level security;

-- The managing org can read/write its rows; the tenant can read their own
-- history (across orgs) — the basis for portability.
drop policy if exists rental_history_access on public.rental_history;
create policy rental_history_access on public.rental_history
  for all to authenticated
  using (org_id in (select public.my_org_ids()) or tenant_user_id = auth.uid())
  with check (org_id in (select public.my_org_ids()));

drop trigger if exists set_org_id_trg on public.rental_history;
create trigger set_org_id_trg before insert on public.rental_history
  for each row execute function public.set_org_id();

-- Surface tenancy status in the token portal so it can switch to history-only.
create or replace function public.portal_get(p_token text)
 returns jsonb
 language sql
 security definer
 set search_path to 'public'
as $function$
  select jsonb_build_object(
    'org_id', t.org_id,
    'tenancy', jsonb_build_object(
      'id', t.id, 'tenant_name', t.tenant_name, 'weekly_rent', t.weekly_rent,
      'property_id', t.property_id, 'lease_start', t.lease_start, 'lease_end', t.lease_end,
      'move_in_date', t.move_in_date, 'bond_amount', t.bond_amount, 'bond_lodged', t.bond_lodged,
      'emergency_contact', t.emergency_contact, 'status', t.status, 'ended_at', t.ended_at),
    'property', (select jsonb_build_object('address', p.address, 'weekly_rent', p.weekly_rent,
      'rent_due_day', p.rent_due_day) from properties p where p.id = t.property_id),
    'contact', (select jsonb_build_object('org', o.name,
      'email', (select m.email from org_members m where m.org_id = o.id and m.role = 'owner' limit 1))
      from organizations o where o.id = t.org_id),
    'rent_online_enabled', coalesce((select o.rent_online_enabled from organizations o where o.id = t.org_id), false),
    'notices', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from notices n
      where n.tenancy_id = t.id or (n.tenancy_id is null and n.property_id = t.property_id)
         or (n.tenancy_id is null and n.property_id is null)), '[]'::jsonb),
    'resources', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from portal_resources r
      where r.property_id is null or r.property_id = t.property_id), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(pay)) from payments pay
      where pay.property_id = t.property_id), '[]'::jsonb),
    'inspections', coalesce((select jsonb_agg(jsonb_build_object(
        'id', ins.id, 'kind', ins.kind, 'scheduled_date', ins.scheduled_date,
        'scheduled_time', ins.scheduled_time, 'status', ins.status) order by ins.scheduled_date)
      from inspections ins where ins.tenancy_id = t.id and ins.status = 'scheduled'), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object(
        'id', mr.id, 'kind', mr.kind, 'category', mr.category, 'title', mr.title,
        'description', mr.description, 'urgency', mr.urgency, 'status', mr.status,
        'created_at', mr.created_at, 'resolved_at', mr.resolved_at,
        'messages', coalesce((select jsonb_agg(jsonb_build_object(
            'author', mm.author, 'body', mm.body, 'status_change', mm.status_change,
            'created_at', mm.created_at) order by mm.created_at)
          from matter_messages mm where mm.request_id = mr.id), '[]'::jsonb)
      ) order by mr.created_at desc)
      from maintenance_requests mr where mr.tenancy_id = t.id), '[]'::jsonb)
  )
  from tenancies t where t.portal_token = p_token;
$function$;
