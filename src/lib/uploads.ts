// Client-side upload guards. The private Storage buckets already enforce a
// file_size_limit + allowed_mime_types server-side (set in
// supabase/migrations/20260929_storage_upload_limits.sql, with inspection-reports
// configured in 20260929_inspection_reports.sql), so oversize/wrong-type uploads
// are rejected regardless of the client. These helpers mirror that config so the
// UI can reject early with a friendly message (instead of a raw Storage API
// error) and so the file picker can hint the allowed types. Keep the numbers in
// step with the bucket config — this is the client-facing copy, not the gate.

export interface BucketLimit {
  maxBytes: number;
  // MIME patterns accepted: exact ("application/pdf") or wildcard ("image/*").
  accept: string[];
}

const MB = 1024 * 1024;

const IMAGES_AND_PDF: string[] = ["image/*", "application/pdf"];
const IMAGES_ONLY: string[] = ["image/*"];

// One entry per bucket the app uploads to, matching the live bucket config.
export const UPLOAD_LIMITS: Record<string, BucketLimit> = {
  "renovation-receipts": { maxBytes: 15 * MB, accept: IMAGES_AND_PDF },
  "tenant-documents": { maxBytes: 15 * MB, accept: IMAGES_AND_PDF },
  "compliance-certificates": { maxBytes: 15 * MB, accept: IMAGES_AND_PDF },
  "tenant-resources": { maxBytes: 20 * MB, accept: IMAGES_AND_PDF },
  "inspection-reports": { maxBytes: 10 * MB, accept: IMAGES_ONLY },
  "maintenance-photos": { maxBytes: 10 * MB, accept: IMAGES_ONLY },
  "property-photos": { maxBytes: 10 * MB, accept: IMAGES_ONLY },
};

// Human-readable size, e.g. 15728640 -> "15 MB". Whole numbers where possible.
// Uses the MB branch once the value rounds to >= 1.0 MB at one decimal, so a size
// just under 1 MB reads "1.0 MB" rather than "1024 KB".
export function formatBytes(bytes: number): string {
  const mb = bytes / MB;
  if (mb >= 0.9995) {
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  const kb = Math.max(1, Math.round(bytes / 1024));
  return `${kb} KB`;
}

// Like formatBytes but rounds UP, for reporting an over-limit file's size: it
// guarantees the figure reads strictly larger than a whole-MB cap, so a file one
// byte over 15 MB shows "15.1 MB" (not a confusing "15 MB. The maximum is 15 MB").
function formatBytesAtLeast(bytes: number): string {
  if (bytes >= MB) {
    const mb = Math.ceil((bytes / MB) * 10) / 10;
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

// Does a file's MIME type satisfy one of the accept patterns? Exact match, or a
// "type/*" wildcard on the major type. An empty/unknown type (some browsers
// don't set one) passes here and is left to the server gate rather than
// blocking a legitimate file on a false negative.
function mimeAccepted(type: string, accept: string[]): boolean {
  if (!type) return true;
  const [major] = type.split("/");
  return accept.some((p) => (p.endsWith("/*") ? p.slice(0, -2) === major : p === type));
}

// A short, human list of the accepted kinds for a message ("images or PDFs").
function acceptLabel(accept: string[]): string {
  const kinds = accept.map((p) =>
    p === "image/*" ? "images" : p === "application/pdf" ? "PDFs" : p
  );
  if (kinds.length === 1) return kinds[0];
  return `${kinds.slice(0, -1).join(", ")} or ${kinds[kinds.length - 1]}`;
}

// Validate a file against a bucket's limits. Returns a friendly error string to
// show the user, or null when the file is acceptable. An unknown bucket returns
// null (no client-side opinion; the server still enforces its own config).
export function validateUpload(file: { size: number; type: string }, bucket: string): string | null {
  const limit = UPLOAD_LIMITS[bucket];
  if (!limit) return null;
  if (file.size > limit.maxBytes) {
    return `That file is ${formatBytesAtLeast(file.size)}. The maximum is ${formatBytes(limit.maxBytes)}.`;
  }
  if (!mimeAccepted(file.type, limit.accept)) {
    return `That file type isn't allowed here — please upload ${acceptLabel(limit.accept)}.`;
  }
  return null;
}

// Value for an <input type="file" accept="..."> so the OS picker pre-filters to
// the allowed kinds. Returns "" for an unknown bucket (no restriction hint).
export function acceptAttr(bucket: string): string {
  return UPLOAD_LIMITS[bucket]?.accept.join(",") ?? "";
}
