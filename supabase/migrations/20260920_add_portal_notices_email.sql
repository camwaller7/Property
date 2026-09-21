-- Tenant portal + manager email. Additive; anon stopgap policies throughout.
-- Applied to project tioeqxdulxqiptlszldp on 2026-09-20.

-- Per-tenancy public portal link.
alter table public.tenancies add column if not exists portal_token text unique;

-- Notices shown in the tenant portal (rent reminders, bills, general info).
create table if not exists public.notices (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  tenancy_id  uuid references public.tenancies(id) on delete cascade,
  category    text not null default 'info',   -- rent | bill | maintenance | info
  title       text not null,
  body        text,
  due_date    date,
  created_at  timestamptz not null default now()
);
create index if not exists notices_tenancy_id_idx on public.notices(tenancy_id);
create index if not exists notices_property_id_idx on public.notices(property_id);

-- Handouts / documents the manager shares to the portal (global or per-property).
create table if not exists public.portal_resources (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade, -- null = all properties
  title       text not null,
  description text,
  path        text,   -- storage path in tenant-resources bucket
  url         text,   -- or an external link
  created_at  timestamptz not null default now()
);

-- Record of emails sent from the app.
create table if not exists public.email_log (
  id          uuid primary key default gen_random_uuid(),
  tenancy_id  uuid references public.tenancies(id) on delete set null,
  to_email    text not null,
  subject     text,
  body        text,
  status      text not null default 'sent',  -- sent | failed
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists email_log_tenancy_id_idx on public.email_log(tenancy_id);

alter table public.notices enable row level security;
alter table public.portal_resources enable row level security;
alter table public.email_log enable row level security;

drop policy if exists notices_anon_all on public.notices;
create policy notices_anon_all on public.notices for all to anon using (true) with check (true);

drop policy if exists portal_resources_anon_all on public.portal_resources;
create policy portal_resources_anon_all on public.portal_resources for all to anon using (true) with check (true);

drop policy if exists email_log_anon_all on public.email_log;
create policy email_log_anon_all on public.email_log for all to anon using (true) with check (true);

-- Private bucket for shared handouts (portal generates signed URLs to read).
insert into storage.buckets (id, name, public)
values ('tenant-resources', 'tenant-resources', false)
on conflict (id) do nothing;

drop policy if exists "tenant resources anon insert" on storage.objects;
create policy "tenant resources anon insert" on storage.objects
  for insert to anon with check (bucket_id = 'tenant-resources');

drop policy if exists "tenant resources anon select" on storage.objects;
create policy "tenant resources anon select" on storage.objects
  for select to anon using (bucket_id = 'tenant-resources');
