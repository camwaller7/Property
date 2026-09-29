-- Capture the actual GST amount on a cost, not just the 1/11th derivation.
-- `amount` remains the total (GST-inclusive) cost; `gst_amount` records the GST
-- component as shown on the invoice (defaults to amount/11 in the UI but is
-- editable, since real invoices can differ from an exact 1/11th — mixed or
-- partly GST-free supplies, rounding). GST-free costs (includes_gst=false) have
-- gst_amount 0/null. Applied to project tioeqxdulxqiptlszldp 2026-09-28.

alter table public.property_costs add column if not exists gst_amount numeric;
