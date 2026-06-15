// src/app/api/players/route.ts
// GET /api/players — paginated list of registered players.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 50));
  const skip = (page - 1) * limit;

  const [players, total] = await Promise.all([
    prisma.user.findMany({
      where: { registrationStatus: { not: null } },
      select: {
        id: true,
        osuUsername: true,
        osuRank: true,
        osuCountry: true,
        osuAvatar: true,
        element: true,
        registrationStatus: true,
        registeredAt: true,
        teamMemberships: {
          select: {
            teamId: true,
            isCaptain: true,
            team: { select: { name: true, status: true } },
          },
        },
      },
      orderBy: { registeredAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where: { registrationStatus: { not: null } } }),
  ]);

  return NextResponse.json({
    players,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
