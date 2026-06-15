// src/app/api/admin/mappool/debug/route.ts
// Temporary debug endpoint — remove after fixing auth issue.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  let staffRecord = null;
  if (session?.user?.id) {
    staffRecord = await prisma.staffMember.findUnique({
      where: { userId: session.user.id },
    });
  }

  return NextResponse.json({
    session: session
      ? { userId: session.user?.id, name: session.user?.name }
      : null,
    adminIds,
    isInAdminIds: session?.user?.id ? adminIds.includes(session.user.id) : false,
    staffRecord,
  });
}
