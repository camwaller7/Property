"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { brand } from "@/lib/brand";

const links = [
  { label: "Invest", href: "#invest" },
  { label: "Rent", href: "#rent" },
  { label: "Renovate", href: "#renovate" },
  { label: "Manage", href: "#manage" },
];

export default function Nav() {
  const { scrollY } = useScroll();
  // Nav background/blur ramps in over the first 80px of scroll — transparent
  // over the hero, frosted once content scrolls beneath it.
  const background = useTransform(
    scrollY,
    [0, 80],
    ["rgba(255,255,255,0)", "rgba(255,255,255,0.8)"]
  );
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);

  return (
    <motion.header
      style={{ background, backdropFilter: "blur(20px)" }}
      className="fixed top-0 z-50 w-full"
    >
      <motion.div
        style={{ opacity: borderOpacity }}
        className="absolute inset-x-0 bottom-0 h-px bg-border"
      />
      <nav className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6 text-sm">
        <Link href="/" className="font-semibold tracking-tight">
          {brand.name}
        </Link>
        <ul className="hidden gap-8 text-[13px] text-muted md:flex">
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} className="cursor-pointer transition-colors hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/app"
          className="rounded-full bg-foreground px-4 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-80"
        >
          Open workspace
        </Link>
      </nav>
    </motion.header>
  );
}
