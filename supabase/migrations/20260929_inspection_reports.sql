-- Routine inspection report output (P2 from docs/DOCUMENT-AUDIT.md). After a
-- routine inspection the manager records room-by-room findings (a condition
-- rating + notes + photos per area), an overall condition and a summary, and any
-- follow-up actions. The report renders as a clean printable page for the
-- owner's records and is surfaced (read-only) to the tenant in their portal.
--
-- Photos live in a private `inspection-reports` bucket, isolated by <org_id>/
-- path prefix, and their storage paths are held inside each area object in the
-- `areas` jsonb. The portal never receives the private paths — portal_get
-- exposes only a per-area photo count.
-- Applied to project tioeqxdulxqiptlszldp 2026-09-29.

create table if not exists public.inspection_reports (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references public.organizations(id),
  inspection_id     uuid references public.inspections(id) on delete set null,
  tenancy_id        uuid references public.tenancies(id) on delete cascade,
  property_id       uuid references public.properties(id) on delete set null,
  kind              text not null default 'routine', -- routine | entry | exit
  inspected_on      date,
  inspector_name    text,
  overall_condition text,          -- good | fair | poor
  summary           text,
  follow_up         text,          -- actions required / for the owner's attention
  -- areas: [{ "area": "Kitchen", "condition": "good", "notes": "...",
  --           "photos": ["<org_id>/<report>/kitchen-1.jpg", ...] }]
  areas             jsonb not null default '[]'::jsonb,
  finalised_at      timestamptz,   -- set when the manager marks it complete/shareable
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists inspection_reports_org_idx on public.inspection_reports(org_id);
create index if not exists inspection_reports_tenancy_idx on public.inspection_reports(tenancy_id);
create index if not exists inspection_reports_inspection_idx on public.inspection_reports(inspection_id);

alter table public.inspection_reports enable row level security;

-- Managers read/write their org's reports; the linked tenant may read a
-- finalised report for their tenancy (owner + tenant visibility).
drop policy if exists inspection_reports_access on public.inspection_reports;
create policy inspection_reports_access on public.inspection_reports
  for all to authenticated
  using (
    org_id in (select public.my_org_ids())
    or (
      finalised_at is not null
      and tenancy_id in (select tpu.tenancy_id from public.tenant_portal_users tpu where tpu.user_id = auth.uid())
    )
  )
  with check (org_id in (select public.my_org_ids()));

drop trigger if exists set_org_id_trg on public.inspection_reports;
create trigger set_org_id_trg before insert on public.inspection_reports
  for each row execute function public.set_org_id();

-- Private bucket for inspection-report photos, isolated by <org_id>/ path
-- prefix. Images only, 10 MB (matches the other photo buckets).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspection-reports', 'inspection-reports', false, 10485760, array['image/*'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "inspection reports org read" on storage.objects;
create policy "inspection reports org read" on storage.objects
  for select to authenticated
  using (bucket_id = 'inspection-reports'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));

drop policy if exists "inspection reports org insert" on storage.objects;
create policy "inspection reports org insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'inspection-reports'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));

drop policy if exists "inspection reports org delete" on storage.objects;
create policy "inspection reports org delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'inspection-reports'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));

-- Extend portal_get to include the tenancy's FINALISED inspection reports. Only
-- text findings + a per-area photo count are exposed; private photo paths are
-- never returned to the (unauthenticated) portal.
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
    'inspection_reports', coalesce((select jsonb_agg(jsonb_build_object(
        'id', ir.id, 'kind', ir.kind, 'inspected_on', ir.inspected_on,
        'inspector_name', ir.inspector_name, 'overall_condition', ir.overall_condition,
        'summary', ir.summary, 'follow_up', ir.follow_up, 'finalised_at', ir.finalised_at,
        'areas', (select coalesce(jsonb_agg(jsonb_build_object(
            'area', a->>'area', 'condition', a->>'condition', 'notes', a->>'notes',
            'photo_count', coalesce(jsonb_array_length(a->'photos'), 0))), '[]'::jsonb)
          from jsonb_array_elements(ir.areas) a))
        order by ir.inspected_on desc nulls last, ir.created_at desc)
      from inspection_reports ir where ir.tenancy_id = t.id and ir.finalised_at is not null), '[]'::jsonb),
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
