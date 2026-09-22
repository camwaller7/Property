-- RENOVATIONS MODULE (applied to tioeqxdulxqiptlszldp 2026-09-22)
-- renovation_projects: a project per property (kitchen reno, repaint, etc.).
-- renovation_costs: itemised, tax-categorised spend, optionally with a receipt.
-- Both org-scoped via RLS (org_id in my_org_ids()) with the set_org_id trigger.
-- Receipts live in a private, org-path-isolated storage bucket.

create table if not exists public.renovation_projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id),
  property_id uuid references public.properties(id) on delete cascade,
  name text not null,
  status text not null default 'planning',
  budget numeric,
  started_on date,
  completed_on date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.renovation_projects
  drop constraint if exists renovation_projects_status_check;
alter table public.renovation_projects
  add constraint renovation_projects_status_check
  check (status in ('planning','in_progress','complete','on_hold'));
create index if not exists renovation_projects_org_idx on public.renovation_projects(org_id);
create index if not exists renovation_projects_property_idx on public.renovation_projects(property_id);

create table if not exists public.renovation_costs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id),
  project_id uuid references public.renovation_projects(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  description text not null,
  category text not null default 'capital_works',
  amount numeric not null default 0,
  spent_on date,
  receipt_path text,
  created_at timestamptz not null default now()
);
alter table public.renovation_costs
  drop constraint if exists renovation_costs_category_check;
alter table public.renovation_costs
  add constraint renovation_costs_category_check
  check (category in ('capital_works','repairs','depreciable','other'));
create index if not exists renovation_costs_org_idx on public.renovation_costs(org_id);
create index if not exists renovation_costs_project_idx on public.renovation_costs(project_id);
create index if not exists renovation_costs_property_idx on public.renovation_costs(property_id);

alter table public.renovation_projects enable row level security;
alter table public.renovation_costs enable row level security;

drop policy if exists renovation_projects_org on public.renovation_projects;
create policy renovation_projects_org on public.renovation_projects
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));

drop policy if exists renovation_costs_org on public.renovation_costs;
create policy renovation_costs_org on public.renovation_costs
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));

drop trigger if exists set_org_id_trg on public.renovation_projects;
create trigger set_org_id_trg before insert on public.renovation_projects
  for each row execute function public.set_org_id();

drop trigger if exists set_org_id_trg on public.renovation_costs;
create trigger set_org_id_trg before insert on public.renovation_costs
  for each row execute function public.set_org_id();

-- Private receipts bucket, files stored as <org_id>/... and reachable only by
-- the owning org (authenticated). No anon access.
insert into storage.buckets (id, name, public)
values ('renovation-receipts', 'renovation-receipts', false)
on conflict (id) do nothing;

drop policy if exists "renovation receipts org read" on storage.objects;
create policy "renovation receipts org read" on storage.objects
  for select to authenticated
  using (bucket_id = 'renovation-receipts'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));

drop policy if exists "renovation receipts org insert" on storage.objects;
create policy "renovation receipts org insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'renovation-receipts'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));

drop policy if exists "renovation receipts org delete" on storage.objects;
create policy "renovation receipts org delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'renovation-receipts'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));
