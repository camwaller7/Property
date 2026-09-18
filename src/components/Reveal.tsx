"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Fade-and-rise-into-view wrapper. Deliberately restrained: 24px of travel,
 * ~0.7s, a slight delay stagger via `delay`. Apple's sites rarely animate
 * more than opacity + a small translate on scroll-in — big bouncy entrances
 * read as "template", not "premium".
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
