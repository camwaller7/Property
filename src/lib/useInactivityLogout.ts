"use client";

import { useEffect } from "react";
import { supabase } from "./supabase";

// Sign the manager out after a period of no activity. "Activity" is any real
// interaction (pointer, key, scroll, touch) plus the tab becoming visible
// again. The last-activity time is stored in localStorage, so a browser that
// was simply closed for longer than the limit also logs out on return — the
// check runs on mount and every minute while the tab is open.
//
// This is a UX/safety layer on top of Supabase's own session expiry; it does
// not weaken RLS, which already protects the data regardless.
const KEY = "corvelle:lastActivityAt";
const LIMIT_MS = 4 * 60 * 60 * 1000; // 4 hours

export function useInactivityLogout(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const now = () => Date.now();
    const read = (): number | null => {
      try {
        const v = localStorage.getItem(KEY);
        return v ? Number(v) : null;
      } catch {
        return null;
      }
    };
    const write = (t: number) => {
      try {
        localStorage.setItem(KEY, String(t));
      } catch {
        /* private mode / blocked storage — timeout just won't persist */
      }
    };
    const clear = () => {
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    };

    const signOutIdle = () => {
      clear();
      supabase.auth.signOut();
    };

    // On mount: if the last recorded activity is older than the limit (e.g. the
    // browser was closed overnight), sign out straight away.
    const last = read();
    if (last != null && now() - last > LIMIT_MS) {
      signOutIdle();
      return;
    }
    write(now());

    const bump = () => write(now());
    const check = () => {
      const l = read();
      if (l != null && now() - l > LIMIT_MS) signOutIdle();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
      else bump();
    };

    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    for (const e of activityEvents) window.addEventListener(e, bump, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(check, 60 * 1000);

    return () => {
      for (const e of activityEvents) window.removeEventListener(e, bump);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [active]);
}
