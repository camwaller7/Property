-- Security hardening (advisors follow-up, 2026-09-29): cap file size and
-- restrict MIME types on the storage buckets. Previously all buckets accepted
-- any type at any size, so the upload endpoints could be abused to store large
-- or arbitrary files. Limits match what the app's file inputs already accept
-- (image/* and PDF for documents; images for photos), so legitimate uploads are
-- unaffected. Applied to project tioeqxdulxqiptlszldp 2026-09-29.

-- Photo buckets: images only, 10 MB.
update storage.buckets
  set file_size_limit = 10485760, allowed_mime_types = array['image/*']
  where id in ('property-photos', 'maintenance-photos');

-- Document/receipt/certificate buckets: images + PDF, 15 MB.
update storage.buckets
  set file_size_limit = 15728640, allowed_mime_types = array['image/*', 'application/pdf']
  where id in ('renovation-receipts', 'tenant-documents', 'compliance-certificates');

-- Manager-shared portal resources (public read): images + PDF, 20 MB.
update storage.buckets
  set file_size_limit = 20971520, allowed_mime_types = array['image/*', 'application/pdf']
  where id = 'tenant-resources';
