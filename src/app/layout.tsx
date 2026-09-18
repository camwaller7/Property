import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import { brand } from "@/lib/brand";
import "./globals.css";

// Using the `geist` package (local font files, bundled with the package)
// rather than next/font/google: it renders identically but needs no
// build-time fetch to fonts.googleapis.com, so it also works in fully
// offline/firewalled CI and build environments.

export const metadata: Metadata = {
  title: `${brand.full} — ${brand.tagline}`,
  description: brand.description,
  icons: { apple: "/icon-192.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
