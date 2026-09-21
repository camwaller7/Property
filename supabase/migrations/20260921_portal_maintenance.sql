-- Tenant portal maintenance requests (applied to tioeqxdulxqiptlszldp 2026-09-21;
-- anon submit-by-token verified). Tenant submits via portal_submit_request;
-- manager works them in the org workspace (org-scoped RLS). portal_get extended
-- with lease/bond, contact (org + owner email) and the tenant's own requests.

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id),
  tenancy_id uuid references public.tenancies(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  category text not null default 'General',
  title text not null,
  description text,
  urgency text not null default 'normal',
  status text not null default 'open',
  photo_path text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists maintenance_org_idx on public.maintenance_requests(org_id);
create index if not exists maintenance_tenancy_idx on public.maintenance_requests(tenancy_id);

alter table public.maintenance_requests enable row level security;
create policy maintenance_org on public.maintenance_requests
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));

insert into storage.buckets (id, name, public)
values ('maintenance-photos', 'maintenance-photos', false)
on conflict (id) do nothing;
drop policy if exists "maintenance photos anon insert" on storage.objects;
create policy "maintenance photos anon insert" on storage.objects
  for insert to anon with check (bucket_id = 'maintenance-photos');
drop policy if exists "maintenance photos auth all" on storage.objects;
create policy "maintenance photos auth all" on storage.objects
  for all to authenticated using (bucket_id = 'maintenance-photos') with check (bucket_id = 'maintenance-photos');

create or replace function public.portal_submit_request(
  p_token text, p_category text, p_title text, p_description text, p_urgency text, p_photo_path text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_ten public.tenancies;
begin
  select * into v_ten from public.tenancies where portal_token = p_token;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if coalesce(trim(p_title),'') = '' then return jsonb_build_object('error','title_required'); end if;
  insert into public.maintenance_requests
    (org_id, tenancy_id, property_id, category, title, description, urgency, photo_path)
  values
    (v_ten.org_id, v_ten.id, v_ten.property_id,
     coalesce(nullif(p_category,''),'General'), p_title, p_description,
     coalesce(nullif(p_urgency,''),'normal'), p_photo_path);
  return jsonb_build_object('ok', true);
end; $$;
grant execute on function public.portal_submit_request(text,text,text,text,text,text) to anon, authenticated;

create or replace function public.portal_get(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'tenancy', jsonb_build_object(
      'id', t.id, 'tenant_name', t.tenant_name, 'weekly_rent', t.weekly_rent,
      'property_id', t.property_id, 'lease_start', t.lease_start, 'lease_end', t.lease_end,
      'move_in_date', t.move_in_date, 'bond_amount', t.bond_amount, 'bond_lodged', t.bond_lodged,
      'emergency_contact', t.emergency_contact),
    'property', (select jsonb_build_object('address', p.address, 'weekly_rent', p.weekly_rent,
      'rent_due_day', p.rent_due_day) from properties p where p.id = t.property_id),
    'contact', (select jsonb_build_object('org', o.name,
      'email', (select m.email from org_members m where m.org_id = o.id and m.role = 'owner' limit 1))
      from organizations o where o.id = t.org_id),
    'notices', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from notices n
      where n.tenancy_id = t.id or (n.tenancy_id is null and n.property_id = t.property_id)
         or (n.tenancy_id is null and n.property_id is null)), '[]'::jsonb),
    'resources', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from portal_resources r
      where r.property_id is null or r.property_id = t.property_id), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(pay)) from payments pay
      where pay.property_id = t.property_id), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object(
        'id', mr.id, 'category', mr.category, 'title', mr.title, 'description', mr.description,
        'urgency', mr.urgency, 'status', mr.status, 'created_at', mr.created_at,
        'resolved_at', mr.resolved_at) order by mr.created_at desc)
      from maintenance_requests mr where mr.tenancy_id = t.id), '[]'::jsonb)
  )
  from tenancies t where t.portal_token = p_token;
$$;
