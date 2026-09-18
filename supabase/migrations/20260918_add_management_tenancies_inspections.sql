-- Property management: tenancies (with onboarding checklist) and inspections.
-- Additive only. RLS enabled; anon granted full access to match the existing
-- stopgap on properties/payments (to be replaced by Supabase Auth + owner_id).
-- Applied to project tioeqxdulxqiptlszldp on 2026-09-18.

create table if not exists public.tenancies (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid references public.properties(id) on delete cascade,
  tenant_name       text,
  tenant_email      text,
  tenant_phone      text,
  emergency_contact text,
  move_in_date      date,
  lease_start       date,
  lease_end         date,
  weekly_rent       numeric,
  bond_amount       numeric,
  bond_lodged       boolean not null default false,
  bond_reference    text,
  status            text not null default 'upcoming', -- upcoming | active | ended
  onboarding        jsonb not null default '[]'::jsonb, -- [{key,label,done,done_date}]
  notes             text,
  created_at        timestamptz not null default now()
);

create table if not exists public.inspections (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid references public.properties(id) on delete cascade,
  tenancy_id       uuid references public.tenancies(id) on delete set null,
  kind             text not null default 'routine', -- entry | routine | exit
  scheduled_date   date,
  scheduled_time   text,
  notice_sent_date date,
  status           text not null default 'scheduled', -- scheduled | completed | cancelled
  notes            text,
  created_at       timestamptz not null default now()
);

create index if not exists tenancies_property_id_idx on public.tenancies(property_id);
create index if not exists inspections_property_id_idx on public.inspections(property_id);
create index if not exists inspections_tenancy_id_idx on public.inspections(tenancy_id);

alter table public.tenancies enable row level security;
alter table public.inspections enable row level security;

-- Stopgap policies: anon full access (matches current properties/payments).
drop policy if exists tenancies_anon_all on public.tenancies;
create policy tenancies_anon_all on public.tenancies
  for all to anon using (true) with check (true);

drop policy if exists inspections_anon_all on public.inspections;
create policy inspections_anon_all on public.inspections
  for all to anon using (true) with check (true);
