-- NOTIFICATIONS (applied to tioeqxdulxqiptlszldp 2026-09-21; verified).
-- Org-scoped manager feed, fed by tenant events (portal RPCs) and a daily
-- pg_cron reminders job. See the applied migration record for the full RPC
-- bodies (portal_submit_request / onboard_submit now also insert a notification).

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  entity_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_org_idx on public.notifications(org_id, read, created_at desc);

alter table public.notifications enable row level security;
create policy notifications_org on public.notifications
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));

-- generate_reminders(): rent due/overdue, lease expiries, upcoming inspections,
-- deduped. Scheduled daily via pg_cron ('daily-reminders', '0 22 * * *').
create or replace function public.generate_reminders()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (org_id, type, title, body, link, entity_id)
  select p.org_id,
         case when p.due_date < current_date then 'rent_overdue' else 'rent_due' end,
         case when p.due_date < current_date then 'Rent overdue' else 'Rent due soon' end,
         'Payment of ' || coalesce('$'||p.amount::text,'rent') || ' due ' || to_char(p.due_date,'DD Mon'),
         '/app/properties', p.id
  from public.payments p
  where p.status in ('due','late') and p.due_date is not null and p.due_date <= current_date + 3
    and not exists (select 1 from public.notifications n where n.entity_id = p.id
                    and n.type in ('rent_due','rent_overdue') and n.created_at > now() - interval '20 hours');

  insert into public.notifications (org_id, type, title, body, link, entity_id)
  select t.org_id, 'lease_expiry', 'Lease ending soon',
         coalesce(t.tenant_name,'A tenancy') || ' lease ends ' || to_char(t.lease_end,'DD Mon'),
         '/app/management', t.id
  from public.tenancies t
  where t.lease_end is not null and t.lease_end between current_date and current_date + 30
    and not exists (select 1 from public.notifications n where n.entity_id = t.id
                    and n.type = 'lease_expiry' and n.created_at > now() - interval '6 days');

  insert into public.notifications (org_id, type, title, body, link, entity_id)
  select i.org_id, 'inspection', 'Inspection coming up',
         initcap(i.kind) || ' inspection on ' || to_char(i.scheduled_date,'DD Mon'),
         '/app/management', i.id
  from public.inspections i
  where i.status = 'scheduled' and i.scheduled_date is not null
    and i.scheduled_date between current_date and current_date + 7
    and not exists (select 1 from public.notifications n where n.entity_id = i.id
                    and n.type = 'inspection' and n.created_at > now() - interval '20 hours');
end; $$;
revoke all on function public.generate_reminders() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('daily-reminders', '0 22 * * *', $$ select public.generate_reminders(); $$);
