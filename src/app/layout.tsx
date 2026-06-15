// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ascension Arena — osu! LAN Tournament",
  description:
    "A first-of-its-kind osu! LAN tournament with an element system, HP-based scoring, and a live team formation mechanic. November 2026.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
