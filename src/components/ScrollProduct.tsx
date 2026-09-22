"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { brand } from "@/lib/brand";

/**
 * The "pin the section and scale/fade a hero visual as you scroll through it"
 * pattern from apple.com product pages. Here it frames the workspace itself —
 * a portfolio dashboard mock — as the product moment. The trick is entirely
 * in useScroll's target + offset mapped onto transforms for a sticky child.
 */
export default function ScrollProduct() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 0.92]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.3], [40, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);

  const tiles = [
    { label: "Portfolio value", value: "$2.4M" },
    { label: "Equity", value: "$980K" },
    { label: "Weekly rent", value: "$1,850" },
    { label: "Portfolio LVR", value: "59%" },
  ];

  return (
    <section ref={ref} className="relative h-[300vh]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden bg-black px-6 text-white">
        <motion.div style={{ y: titleY, opacity: titleOpacity }} className="z-10 mb-8 text-center">
          <p className="text-sm font-medium text-white/60">One workspace</p>
          <h2 className="text-5xl font-semibold tracking-tightest md:text-7xl">
            Your whole portfolio.
          </h2>
        </motion.div>

        <motion.div
          style={{ scale, opacity }}
          className="relative aspect-[16/10] w-[min(92vw,940px)] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black p-6 shadow-2xl md:p-10"
        >
          <div className="mb-6 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="ml-2 text-xs text-white/40">{brand.name} — Portfolio</span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-2xl bg-white/5 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                  {t.label}
                </div>
                <div className="mt-2 text-xl font-semibold text-white md:text-2xl">{t.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {[70, 45, 88].map((w, i) => (
              <div key={i} className="rounded-2xl bg-white/5 p-4">
                <div className="h-2 rounded-full bg-white/10" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
