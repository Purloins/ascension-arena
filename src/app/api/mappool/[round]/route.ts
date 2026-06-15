// src/app/api/mappool/[round]/route.ts
// GET /api/mappool/:round — public, returns the visible mappool for a round.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Round } from "@prisma/client";

const ROUND_MAP: Record<string, Round> = {
  qualifiers:    "QUALIFIERS",
  quarterfinals: "QUARTERFINALS",
  semifinals:    "SEMIFINALS",
  finals:        "FINALS",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { round: string } }
) {
  const round = ROUND_MAP[params.round.toLowerCase()];
  if (!round) {
    return NextResponse.json({ error: "Unknown round." }, { status: 404 });
  }

  const mappool = await prisma.mappool.findUnique({
    where: { round },
    include: { maps: { orderBy: { slotNumber: "asc" } } },
  });

  if (!mappool || !mappool.visible) {
    return NextResponse.json(
      { error: "This mappool is not yet available." },
      { status: 404 }
    );
  }

  return NextResponse.json({ round, mappool });
}
