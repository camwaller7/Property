-- Pre-tenant / condition photos (applied to tioeqxdulxqiptlszldp 2026-09-22).
-- A per-property historical photo record the landlord captures before a tenant
-- moves in (survives tenant turnover). Org-scoped RLS; private bucket with
-- <org_id>/ path isolation (landlord only — no anon access).

create table if not exists public.property_photos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id),
  property_id uuid references public.properties(id) on delete cascade,
  path text not null,
  caption text,
  taken_on date,
  created_at timestamptz not null default now()
);
create index if not exists property_photos_org_idx on public.property_photos(org_id);
create index if not exists property_photos_property_idx on public.property_photos(property_id);

alter table public.property_photos enable row level security;
drop policy if exists property_photos_org on public.property_photos;
create policy property_photos_org on public.property_photos
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));

drop trigger if exists set_org_id_trg on public.property_photos;
create trigger set_org_id_trg before insert on public.property_photos
  for each row execute function public.set_org_id();

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', false)
on conflict (id) do nothing;

drop policy if exists "property photos org read" on storage.objects;
create policy "property photos org read" on storage.objects
  for select to authenticated
  using (bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));

drop policy if exists "property photos org insert" on storage.objects;
create policy "property photos org insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));

drop policy if exists "property photos org delete" on storage.objects;
create policy "property photos org delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = any(array(select (public.my_org_ids())::text)));
