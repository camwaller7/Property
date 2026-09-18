import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

// PWA manifest — lets the workspace be "Added to Home Screen" on a phone,
// carried over from the original tracker.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.full,
    short_name: brand.name,
    description: brand.description,
    start_url: "/app",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
