-- Condition-report issue + tenant acknowledgement (P1 from DOCUMENT-AUDIT.md).
-- The ingoing/outgoing condition report is the document a bond claim rests on,
-- so it must be issued to the tenant and counter-signed by them. This tracks a
-- per-tenancy report record: the manager issues it (optionally attaching the
-- completed report to the private tenant-documents bucket), and the tenant
-- acknowledges it in their portal (typed name + optional comment), which stamps
-- acknowledged_at. Landlord + that tenant only.
-- Applied to project tioeqxdulxqiptlszldp 2026-09-28.

create table if not exists public.condition_reports (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid references public.organizations(id),
  tenancy_id         uuid references public.tenancies(id) on delete cascade,
  property_id        uuid references public.properties(id) on delete set null,
  kind               text not null default 'ingoing', -- ingoing | outgoing
  document_path      text,          -- optional completed report in tenant-documents bucket
  notes              text,
  issued_at          timestamptz not null default now(),
  acknowledged_at    timestamptz,
  acknowledged_name  text,          -- tenant's typed name (counter-sign)
  tenant_comment     text,          -- tenant's note / any disagreement
  created_at         timestamptz not null default now()
);
create index if not exists condition_reports_org_idx on public.condition_reports(org_id);
create index if not exists condition_reports_tenancy_idx on public.condition_reports(tenancy_id);

alter table public.condition_reports enable row level security;

-- Managers read/write their org's reports; the linked tenant may read their own.
drop policy if exists condition_reports_access on public.condition_reports;
create policy condition_reports_access on public.condition_reports
  for all to authenticated
  using (
    org_id in (select public.my_org_ids())
    or tenancy_id in (select tpu.tenancy_id from public.tenant_portal_users tpu where tpu.user_id = auth.uid())
  )
  with check (org_id in (select public.my_org_ids()));

drop trigger if exists set_org_id_trg on public.condition_reports;
create trigger set_org_id_trg before insert on public.condition_reports
  for each row execute function public.set_org_id();

-- Tenant acknowledges (counter-signs) a condition report from their portal.
-- Token-scoped like the other portal RPCs; only stamps a report belonging to
-- the token's tenancy that isn't already acknowledged.
create or replace function public.portal_acknowledge_condition_report(
  p_token text, p_report_id uuid, p_name text, p_comment text
) returns jsonb
 language plpgsql security definer set search_path = public as $$
declare v_ten public.tenancies; v_rep public.condition_reports;
begin
  select * into v_ten from public.tenancies where portal_token = p_token;
  if not found then return jsonb_build_object('error','not_found'); end if;
  select * into v_rep from public.condition_reports where id = p_report_id;
  if not found or v_rep.tenancy_id <> v_ten.id then
    return jsonb_build_object('error','report_not_found');
  end if;
  if coalesce(trim(p_name),'') = '' then return jsonb_build_object('error','name_required'); end if;
  update public.condition_reports
    set acknowledged_at = now(),
        acknowledged_name = trim(p_name),
        tenant_comment = nullif(trim(p_comment), '')
    where id = p_report_id and acknowledged_at is null;
  return jsonb_build_object('ok', true);
end; $$;
grant execute on function public.portal_acknowledge_condition_report(text, uuid, text, text) to anon, authenticated;

-- Extend portal_get to include the tenancy's condition reports.
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
    'condition_reports', coalesce((select jsonb_agg(jsonb_build_object(
        'id', cr.id, 'kind', cr.kind, 'notes', cr.notes, 'issued_at', cr.issued_at,
        'acknowledged_at', cr.acknowledged_at, 'acknowledged_name', cr.acknowledged_name,
        'tenant_comment', cr.tenant_comment, 'has_document', (cr.document_path is not null))
        order by cr.issued_at desc)
      from condition_reports cr where cr.tenancy_id = t.id), '[]'::jsonb),
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
