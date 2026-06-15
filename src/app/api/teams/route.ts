// src/app/api/teams/route.ts
// GET  /api/teams — list all teams.
// POST /api/teams — create a team (creator becomes captain).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateTeamSchema = z.object({
  name: z.string().min(2).max(32).optional(),
});

export async function GET() {
  const teams = await prisma.team.findMany({
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              osuUsername: true,
              osuRank: true,
              osuCountry: true,
              osuAvatar: true,
              element: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ teams });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = CreateTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { registrationStatus: true, element: true, teamMemberships: true },
  });

  if (!user || user.registrationStatus !== "ACTIVE") {
    return NextResponse.json(
      {
        error:
          "You must be a registered player with an assigned element to form a team. Team formation opens after the element roll.",
      },
      { status: 403 }
    );
  }

  if (user.teamMemberships.length > 0) {
    return NextResponse.json({ error: "You are already in a team." }, { status: 409 });
  }

  const team = await prisma.$transaction(async (tx) => {
    const newTeam = await tx.team.create({
      data: { name: parsed.data.name ?? null, status: "FORMING" },
    });
    await tx.teamMember.create({
      data: { userId, teamId: newTeam.id, isCaptain: true },
    });
    await tx.user.update({
      where: { id: userId },
      data: { registrationStatus: "TEAMED" },
    });
    return newTeam;
  });

  return NextResponse.json({ success: true, team }, { status: 201 });
}
