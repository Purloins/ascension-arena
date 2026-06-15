// src/app/api/admin/mappool/[round]/visibility/route.ts
// PATCH /api/admin/mappool/:round/visibility — toggle a pool's public visibility

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Round } from "@prisma/client";

const ROUND_MAP: Record<string, Round> = {
  qualifiers:    "QUALIFIERS",
  quarterfinals: "QUARTERFINALS",
  semifinals:    "SEMIFINALS",
  finals:        "FINALS",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { round: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim());
  const staff = await prisma.staffMember.findUnique({ where: { userId: session.user.id } });
  if (!staff && !adminIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const round = ROUND_MAP[params.round.toLowerCase()];
  if (!round) return NextResponse.json({ error: "Unknown round." }, { status: 404 });

  const { visible } = await request.json().catch(() => ({}));
  if (typeof visible !== "boolean") {
    return NextResponse.json({ error: "visible (boolean) required." }, { status: 400 });
  }

  const mappool = await prisma.mappool.upsert({
    where: { round },
    update: { visible },
    create: { round, visible },
  });

  return NextResponse.json({ success: true, visible: mappool.visible });
}
