// src/middleware.ts
// Protects /admin/* and /api/admin/* from unauthenticated access.

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const session = await auth();
    if (!session) {
      if (pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      return NextResponse.json({ error: "Forbidden." }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
