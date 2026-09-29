-- SECURITY FIX (2026-09-29). condition_reports and rental_history (from PR #18)
-- and inspection_reports (PR #19) each used a single `FOR ALL` RLS policy whose
-- USING clause included a non-org actor (the linked tenant, or an approved
-- share reader) while WITH CHECK allowed only org members. Postgres evaluates
-- only USING — not WITH CHECK — for DELETE, so a signed-in tenant could DELETE
-- (and the shape also implied UPDATE via USING) their own rows directly through
-- the Supabase client, bypassing the app UI. For rental_history that let a
-- tenant erase adverse history about themselves before a future manager's
-- approved share could read it.
--
-- Fix: split each into an org-scoped `FOR ALL` policy (managers keep full
-- access) plus a read-only `FOR SELECT` policy for the tenant/approved-share
-- paths. Non-org actors can now only read. Tenant acknowledgement of condition
-- reports goes through the SECURITY DEFINER RPC portal_acknowledge_condition_report,
-- so it does not depend on a direct table-write policy and is unaffected.
-- Applied to project tioeqxdulxqiptlszldp 2026-09-29.

-- condition_reports -----------------------------------------------------------
drop policy if exists condition_reports_access on public.condition_reports;
drop policy if exists condition_reports_org on public.condition_reports;
drop policy if exists condition_reports_tenant_read on public.condition_reports;
create policy condition_reports_org on public.condition_reports
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));
create policy condition_reports_tenant_read on public.condition_reports
  for select to authenticated
  using (tenancy_id in (select tpu.tenancy_id from public.tenant_portal_users tpu where tpu.user_id = auth.uid()));

-- inspection_reports ----------------------------------------------------------
drop policy if exists inspection_reports_access on public.inspection_reports;
drop policy if exists inspection_reports_org on public.inspection_reports;
drop policy if exists inspection_reports_tenant_read on public.inspection_reports;
create policy inspection_reports_org on public.inspection_reports
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));
create policy inspection_reports_tenant_read on public.inspection_reports
  for select to authenticated
  using (finalised_at is not null and tenancy_id in (select tpu.tenancy_id from public.tenant_portal_users tpu where tpu.user_id = auth.uid()));

-- rental_history --------------------------------------------------------------
drop policy if exists rental_history_access on public.rental_history;
drop policy if exists rental_history_org on public.rental_history;
drop policy if exists rental_history_read on public.rental_history;
create policy rental_history_org on public.rental_history
  for all to authenticated
  using (org_id in (select public.my_org_ids()))
  with check (org_id in (select public.my_org_ids()));
create policy rental_history_read on public.rental_history
  for select to authenticated
  using (
    tenant_user_id = auth.uid()
    or exists (
      select 1 from public.rental_history_shares s
      where s.tenant_user_id = rental_history.tenant_user_id
        and s.requester_org_id in (select public.my_org_ids())
        and s.status = 'approved'
    )
  );
