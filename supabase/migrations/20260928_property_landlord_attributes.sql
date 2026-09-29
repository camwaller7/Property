-- P1 from DOCUMENT-AUDIT.md: landlord legal identity + property attributes that
-- drive start-of-tenancy hand-over. The landlord's legal name and a service
-- address for notices are a legal must on the agreement; whether the property
-- is strata (by-laws must be given) or has a pool/spa (safety obligations)
-- gates the right clauses + portal disclosures.
-- Applied to project tioeqxdulxqiptlszldp 2026-09-28.

alter table public.properties add column if not exists landlord_name text;
alter table public.properties add column if not exists landlord_service_address text;
alter table public.properties add column if not exists has_pool boolean not null default false;
alter table public.properties add column if not exists is_strata boolean not null default false;
