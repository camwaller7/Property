-- Transfer a tenant to another property in the SAME portfolio, without a new
-- application. One atomic action: create a fresh live tenancy on the target
-- property carrying the tenant's identity forward, move the people + their
-- documents (lease_tenants) across, re-point the tenant's portal login to the
-- new tenancy, then snapshot + end the old tenancy (so the old property shows a
-- past-tenancy record like any ended lease).
--
-- Cross-property only — never crosses org isolation. The caller must be a
-- member of the tenancy's org, and the target property must be in the same org.
-- Applied to project tioeqxdulxqiptlszldp 2026-09-25.

create or replace function public.transfer_tenancy(
  p_tenancy_id     uuid,
  p_new_property_id uuid,
  p_move_in_date   date default null,
  p_lease_start    date default null,
  p_lease_end      date default null,
  p_weekly_rent    numeric default null,
  p_conduct_note   text default null
) returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_old      public.tenancies%rowtype;
  v_org      uuid;
  v_new_id   uuid;
  v_old_addr text;
  v_user     uuid;
  v_note     text;
begin
  select * into v_old from public.tenancies where id = p_tenancy_id;
  if not found then
    return jsonb_build_object('error', 'tenancy_not_found');
  end if;
  v_org := v_old.org_id;

  -- Authorisation: caller must belong to the tenancy's org.
  if not (v_org in (select public.my_org_ids())) then
    return jsonb_build_object('error', 'not_authorised');
  end if;
  if p_new_property_id = v_old.property_id then
    return jsonb_build_object('error', 'same_property');
  end if;
  -- Target property must be in the same portfolio (no cross-org transfer).
  if not exists (
    select 1 from public.properties
    where id = p_new_property_id and org_id = v_org
  ) then
    return jsonb_build_object('error', 'target_not_in_portfolio');
  end if;

  -- 1) New live tenancy on the target property. Fresh portal_token (the old
  --    ended tenancy keeps its own; portal_token is unique). onboarding resets.
  insert into public.tenancies (
    org_id, property_id, tenant_name, tenant_email, tenant_phone,
    emergency_contact, move_in_date, lease_start, lease_end, weekly_rent,
    bond_amount, bond_lodged, bond_reference, status, rent_frequency,
    onboarding, notes, portal_token
  ) values (
    v_org, p_new_property_id, v_old.tenant_name, v_old.tenant_email, v_old.tenant_phone,
    v_old.emergency_contact,
    coalesce(p_move_in_date, current_date),
    coalesce(p_lease_start, current_date),
    p_lease_end,
    coalesce(p_weekly_rent, v_old.weekly_rent),
    v_old.bond_amount, v_old.bond_lodged, v_old.bond_reference,
    'active', v_old.rent_frequency,
    '[]'::jsonb, v_old.notes, replace(gen_random_uuid()::text, '-', '')
  ) returning id into v_new_id;

  -- 2) Move the people on the lease (and their documents) to the new tenancy.
  update public.lease_tenants set tenancy_id = v_new_id where tenancy_id = p_tenancy_id;

  -- 3) Re-point the tenant's portal account so their login lands on the new
  --    property with live info (no re-claim needed).
  update public.tenant_portal_users set tenancy_id = v_new_id where tenancy_id = p_tenancy_id;

  -- 4) Snapshot + end the old tenancy (mirrors end_tenancy behaviour).
  select address into v_old_addr from public.properties where id = v_old.property_id;
  select user_id into v_user from public.tenant_portal_users where tenancy_id = v_new_id limit 1;
  v_note := coalesce(nullif(btrim(p_conduct_note), ''), 'Transferred to another property in the same portfolio.');

  insert into public.rental_history (
    org_id, tenancy_id, property_id, tenant_user_id, property_address, tenant_name,
    lease_start, lease_end, ended_on, weekly_rent, rent_frequency, bond_amount, conduct_note
  ) values (
    v_org, p_tenancy_id, v_old.property_id, v_user, v_old_addr, v_old.tenant_name,
    v_old.lease_start, v_old.lease_end, current_date, v_old.weekly_rent,
    v_old.rent_frequency, v_old.bond_amount, v_note
  );

  update public.tenancies
    set status = 'ended', ended_at = now()
    where id = p_tenancy_id;

  return jsonb_build_object('ok', true, 'new_tenancy_id', v_new_id);
end $function$;

revoke all on function public.transfer_tenancy(uuid, uuid, date, date, date, numeric, text) from public;
grant execute on function public.transfer_tenancy(uuid, uuid, date, date, date, numeric, text) to authenticated;
