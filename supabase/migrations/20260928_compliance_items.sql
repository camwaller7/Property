-- Compliance & safety register (P1 from docs/DOCUMENT-AUDIT.md). Per-property
-- recurring safety obligations — smoke alarms, gas, electrical, pool/spa fence,
-- corded blinds, minimum housing standards — each with a cadence, a last-done
-- date, a computed next-due date, the servicing provider and a stored
-- certificate. The app projects next_due into the landlord's calendar +
-- dashboard and flags overdue items. Landlord-only; never exposed to tenants.
--
-- Cadences vary by state and are the manager's to set per item (defaults are
-- suggested in the UI): common baselines are smoke alarms annually, gas and
-- electrical every ~2 years — confirm against each state's rules.
-- Applied to project tioeqxdulxqiptlszldp 2026-09-28.

create table if not exists public.compliance_items (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid references public.organizations(id),
  property_id      uuid references public.properties(id) on delete cascade,
  kind             text not null default 'other', -- smoke_alarm | gas | electrical | pool | blind_cords | min_standards | other
  label            text,
  provider         text,          -- who performs the check (licensed tech / electrician / gas fitter)
  last_done        date,
  interval_months  integer not null default 12,
  next_due         date,
  certificate_path text,          -- private compliance-certificates bucket, <org_id>/ path
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists compliance_items_org_idx on public.compliance_items(org_id);
create index if not exists compliance_items_property_idx on public.compliance_items(property_id);

alter table public.compliance_items enable row level security;
drop policy if exists compliance_items_org on public.compliance_items;
create policy compliance_items_org on public.compliance_items
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));

drop trigger if exists set_org_id_trg on public.compliance_items;
create trigger set_org_id_trg before insert on public.compliance_items
  for each row execute function public.set_org_id();

-- Private bucket for compliance certificates, isolated by <org_id>/ path prefix.
insert into storage.buckets (id, name, public)
values ('compliance-certificates', 'compliance-certificates', false)
on conflict (id) do nothing;

drop policy if exists "compliance certs org read" on storage.objects;
create policy "compliance certs org read" on storage.objects
  for select to authenticated
  using (bucket_id = 'compliance-certificates'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));

drop policy if exists "compliance certs org insert" on storage.objects;
create policy "compliance certs org insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'compliance-certificates'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));

drop policy if exists "compliance certs org delete" on storage.objects;
create policy "compliance certs org delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'compliance-certificates'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));
