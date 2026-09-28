-- Fix: manager-created matters/tasks failed the maintenance_requests RLS check
-- ("new row violates row-level security policy"). Every other org-scoped table
-- fills org_id from the caller's org via a set_org_id() BEFORE-INSERT trigger,
-- but maintenance_requests was missing it, so a manager insert (which doesn't
-- send org_id) had org_id NULL and failed the WITH CHECK (org_id in my_org_ids()).
-- Tenant-side inserts go through a SECURITY DEFINER RPC that already sets org_id,
-- so this only affected the manager "new task" path. Applied live 2026-09-28.

drop trigger if exists set_org_id_trg on public.maintenance_requests;
create trigger set_org_id_trg before insert on public.maintenance_requests
  for each row execute function public.set_org_id();
