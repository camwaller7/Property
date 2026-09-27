-- GST tracking on property costs. In Australia most property expenses are
-- GST-inclusive (the GST component = amount / 11), but several common outgoings
-- are GST-free or input-taxed (council rates, water, land tax, bank interest,
-- residential-related supplies). So GST is opt-in per cost rather than assumed
-- on every line: includes_gst defaults true (most invoices carry GST) and the
-- cost tracking page derives the claimable GST from the rows flagged true.
-- Applied to project tioeqxdulxqiptlszldp 2026-09-27.

alter table public.property_costs
  add column if not exists includes_gst boolean not null default true;
