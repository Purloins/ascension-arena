// src/middleware.ts
// Protects /admin/* — redirects to / if not logged in.
// NOTE: auth() in middleware requires AUTH_SECRET and AUTH_TRUST_HOST=true on Vercel.

export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/admin/:path*"],
};
