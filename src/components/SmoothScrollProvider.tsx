"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";

/**
 * Wraps the app in Lenis's smooth-scroll physics — the subtle inertia and
 * easing that makes scroll-driven sites (Apple's included) feel weighted
 * rather than jumpy. Framer Motion's scroll hooks (useScroll/useTransform)
 * read the native scroll position, so they keep working unmodified on top
 * of this — no extra wiring needed in child components.
 */
export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
