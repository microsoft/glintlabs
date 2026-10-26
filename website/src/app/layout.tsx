import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { parseSitePalette } from "./site-palette";
import "@glint-labs/data-visuals/styles.css";
import "./globals.css";
import "./site-theme.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Glint Labs",
  description:
    "People Science research and practical tools for informed workplace decisions.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-site-palette={parseSitePalette(process.env.GLINT_LABS_SITE_PALETTE)}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
