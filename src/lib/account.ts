// Account-deletion grace window. When a manager requests deletion the org is
// marked with deletion_requested_at; it stays recoverable for this many days,
// then a purge job removes the data.
export const DELETION_GRACE_DAYS = 30;

// The date (YYYY-MM-DD) an org is scheduled to be purged, given when deletion
// was requested. Returns null when no request is pending.
export function deletionScheduledDate(requestedAt: string | null | undefined): string | null {
  if (!requestedAt) return null;
  const d = new Date(requestedAt);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + DELETION_GRACE_DAYS);
  return d.toISOString().slice(0, 10);
}

// Whole days left in the grace window from now (never negative). Null when no
// request is pending. Used to show "X days left to cancel".
export function deletionDaysLeft(
  requestedAt: string | null | undefined,
  now: Date = new Date()
): number | null {
  const scheduled = deletionScheduledDate(requestedAt);
  if (!scheduled) return null;
  const end = new Date(scheduled + "T00:00:00").getTime();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((end - today.getTime()) / 86400000));
}
