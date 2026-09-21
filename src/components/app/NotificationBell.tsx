"use client";

import { useState } from "react";
import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio";
import { fmtDate } from "@/lib/format";

export default function NotificationBell() {
  const { notifications, unreadCount, markNotificationsRead } = usePortfolio();
  const [open, setOpen] = useState(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) markNotificationsRead();
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-surface"
      >
        <span aria-hidden className="text-base">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-bad px-1 text-[11px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-border bg-background p-2 shadow-2xl">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Notifications
            </div>
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.link || "/app"}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-3 py-2 hover:bg-surface"
                    >
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.body && <div className="text-xs text-muted">{n.body}</div>}
                      <div className="mt-0.5 text-[11px] text-muted">{fmtDate(n.created_at)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
