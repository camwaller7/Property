-- Tenant onboarding applications: one per tenancy, reachable by a public
-- unguessable token. Applicant fills the form + uploads docs; on submit the
-- data lands here and flows into the tenancy. Additive; anon stopgap policies
-- match the rest of the schema (to be replaced by Auth + scoped RLS).
-- Applied to project tioeqxdulxqiptlszldp on 2026-09-18.

create table if not exists public.tenant_applications (
  id           uuid primary key default gen_random_uuid(),
  tenancy_id   uuid references public.tenancies(id) on delete cascade,
  token        text unique not null,
  status       text not null default 'invited',   -- invited | submitted
  data         jsonb not null default '{}'::jsonb, -- all applicant form fields
  documents    jsonb not null default '[]'::jsonb, -- [{kind,name,path,size,uploaded_at}]
  submitted_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists tenant_applications_tenancy_id_idx on public.tenant_applications(tenancy_id);
create index if not exists tenant_applications_token_idx on public.tenant_applications(token);

alter table public.tenant_applications enable row level security;

drop policy if exists tenant_applications_anon_all on public.tenant_applications;
create policy tenant_applications_anon_all on public.tenant_applications
  for all to anon using (true) with check (true);

-- Private bucket for uploaded ID / income / reference documents. Kept private;
-- the owner app views files via short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('tenant-documents', 'tenant-documents', false)
on conflict (id) do nothing;

drop policy if exists "tenant docs anon insert" on storage.objects;
create policy "tenant docs anon insert" on storage.objects
  for insert to anon with check (bucket_id = 'tenant-documents');

drop policy if exists "tenant docs anon select" on storage.objects;
create policy "tenant docs anon select" on storage.objects
  for select to anon using (bucket_id = 'tenant-documents');
