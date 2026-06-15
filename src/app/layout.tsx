import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ascension Arena",
  description: "An osu! LAN tournament.",
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
