-- Extend portal_get so the tenant portal can show the landlord's legal name +
-- service address (for serving notices) and the strata / pool disclosures that
-- must be handed over at the start of a tenancy. Additive to the condition-
-- reports version. Applied to project tioeqxdulxqiptlszldp 2026-09-28.

create or replace function public.portal_get(p_token text)
 returns jsonb
 language sql
 security definer
 set search_path to 'public'
as $function$
  select jsonb_build_object(
    'org_id', t.org_id,
    'tenancy', jsonb_build_object(
      'id', t.id, 'tenant_name', t.tenant_name, 'weekly_rent', t.weekly_rent,
      'property_id', t.property_id, 'lease_start', t.lease_start, 'lease_end', t.lease_end,
      'move_in_date', t.move_in_date, 'bond_amount', t.bond_amount, 'bond_lodged', t.bond_lodged,
      'emergency_contact', t.emergency_contact, 'status', t.status, 'ended_at', t.ended_at),
    'property', (select jsonb_build_object('address', p.address, 'weekly_rent', p.weekly_rent,
      'rent_due_day', p.rent_due_day, 'is_strata', p.is_strata, 'has_pool', p.has_pool)
      from properties p where p.id = t.property_id),
    'contact', (select jsonb_build_object('org', o.name,
      'email', (select m.email from org_members m where m.org_id = o.id and m.role = 'owner' limit 1),
      'landlord_name', (select pr.landlord_name from properties pr where pr.id = t.property_id),
      'landlord_service_address', (select pr.landlord_service_address from properties pr where pr.id = t.property_id))
      from organizations o where o.id = t.org_id),
    'rent_online_enabled', coalesce((select o.rent_online_enabled from organizations o where o.id = t.org_id), false),
    'notices', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from notices n
      where n.tenancy_id = t.id or (n.tenancy_id is null and n.property_id = t.property_id)
         or (n.tenancy_id is null and n.property_id is null)), '[]'::jsonb),
    'resources', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from portal_resources r
      where r.property_id is null or r.property_id = t.property_id), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(pay)) from payments pay
      where pay.property_id = t.property_id), '[]'::jsonb),
    'inspections', coalesce((select jsonb_agg(jsonb_build_object(
        'id', ins.id, 'kind', ins.kind, 'scheduled_date', ins.scheduled_date,
        'scheduled_time', ins.scheduled_time, 'status', ins.status) order by ins.scheduled_date)
      from inspections ins where ins.tenancy_id = t.id and ins.status = 'scheduled'), '[]'::jsonb),
    'condition_reports', coalesce((select jsonb_agg(jsonb_build_object(
        'id', cr.id, 'kind', cr.kind, 'notes', cr.notes, 'issued_at', cr.issued_at,
        'acknowledged_at', cr.acknowledged_at, 'acknowledged_name', cr.acknowledged_name,
        'tenant_comment', cr.tenant_comment, 'has_document', (cr.document_path is not null))
        order by cr.issued_at desc)
      from condition_reports cr where cr.tenancy_id = t.id), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object(
        'id', mr.id, 'kind', mr.kind, 'category', mr.category, 'title', mr.title,
        'description', mr.description, 'urgency', mr.urgency, 'status', mr.status,
        'created_at', mr.created_at, 'resolved_at', mr.resolved_at,
        'messages', coalesce((select jsonb_agg(jsonb_build_object(
            'author', mm.author, 'body', mm.body, 'status_change', mm.status_change,
            'created_at', mm.created_at) order by mm.created_at)
          from matter_messages mm where mm.request_id = mr.id), '[]'::jsonb)
      ) order by mr.created_at desc)
      from maintenance_requests mr where mr.tenancy_id = t.id), '[]'::jsonb)
  )
  from tenancies t where t.portal_token = p_token;
$function$;
