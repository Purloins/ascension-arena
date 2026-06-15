// src/app/layout.tsx
// Root layout — wraps every page with the shared nav and background.

import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/lib/auth";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Ascension Arena — osu! LAN Tournament",
  description:
    "A first-of-its-kind osu! LAN tournament with an element system, HP-based scoring, and a live team formation mechanic. November 2026.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const loggedIn = !!session?.user;
  const username = session?.user?.name ?? null;

  return (
    <html lang="en">
      <body>
        {/* Shared background — visible on every page */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: `
            radial-gradient(ellipse 80% 60% at 70% -10%, rgba(139,92,246,0.09) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 0% 80%, rgba(219,39,119,0.06) 0%, transparent 55%)
          `,
        }} />

        {/* Shared nav — reads session server-side */}
        <Nav loggedIn={loggedIn} username={username} />

        {/* Page content */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
