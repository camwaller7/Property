-- Multiple people under one lease + richer per-person details.
-- A tenancy is the LEASE; each person on it is a row in lease_tenants (name,
-- contact, structured emergency contact, and per-person ID/documents). One
-- person is flagged is_primary and their contact is mirrored onto the tenancy
-- row (tenant_name/email/phone) so the existing portal, applications and email
-- fan-out keep working unchanged. Org-scoped RLS; a private tenant-documents
-- bucket with <org_id>/ path isolation for per-person ID/documents (PR2 UI).
-- Applied to project tioeqxdulxqiptlszldp 2026-09-24.

create table if not exists public.lease_tenants (
  id                       uuid primary key default gen_random_uuid(),
  org_id                   uuid references public.organizations(id),
  tenancy_id               uuid references public.tenancies(id) on delete cascade,
  name                     text,
  email                    text,
  phone                    text,
  is_primary               boolean not null default false,
  emergency_name           text,
  emergency_phone          text,
  emergency_relationship   text,
  documents                jsonb not null default '[]'::jsonb, -- [{kind,name,path,size,uploaded_at}]
  created_at               timestamptz not null default now()
);
create index if not exists lease_tenants_org_idx on public.lease_tenants(org_id);
create index if not exists lease_tenants_tenancy_idx on public.lease_tenants(tenancy_id);

alter table public.lease_tenants enable row level security;
drop policy if exists lease_tenants_org on public.lease_tenants;
create policy lease_tenants_org on public.lease_tenants
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));

drop trigger if exists set_org_id_trg on public.lease_tenants;
create trigger set_org_id_trg before insert on public.lease_tenants
  for each row execute function public.set_org_id();

-- Private bucket for per-person ID / documents (landlord only — no anon).
insert into storage.buckets (id, name, public)
values ('tenant-documents', 'tenant-documents', false)
on conflict (id) do nothing;

drop policy if exists "tenant documents org read" on storage.objects;
create policy "tenant documents org read" on storage.objects
  for select to authenticated
  using (bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));

drop policy if exists "tenant documents org insert" on storage.objects;
create policy "tenant documents org insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));

drop policy if exists "tenant documents org delete" on storage.objects;
create policy "tenant documents org delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));
