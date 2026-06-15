// src/app/api/teams/[teamId]/route.ts
// GET    /api/teams/:id — get one team.
// POST   /api/teams/:id — join a team.
// DELETE /api/teams/:id — leave a team.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { teamId: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const team = await prisma.team.findUnique({
    where: { id: params.teamId },
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
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }
  return NextResponse.json({ team });
}

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { registrationStatus: true, teamMemberships: true },
  });

  if (!user || user.registrationStatus !== "ACTIVE") {
    return NextResponse.json(
      { error: "You must have an assigned element and no existing team to join." },
      { status: 403 }
    );
  }
  if (user.teamMemberships.length > 0) {
    return NextResponse.json({ error: "You are already in a team." }, { status: 409 });
  }

  const team = await prisma.team.findUnique({
    where: { id: params.teamId },
    include: { members: true },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }
  if (team.status !== "FORMING") {
    return NextResponse.json(
      { error: "This team is no longer accepting members." },
      { status: 403 }
    );
  }
  if (team.members.length >= 3) {
    return NextResponse.json({ error: "Team is full (max 3 players)." }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.create({
      data: { userId, teamId: params.teamId, isCaptain: false },
    });
    await tx.user.update({
      where: { id: userId },
      data: { registrationStatus: "TEAMED" },
    });
    if (team.members.length + 1 === 3) {
      await tx.team.update({
        where: { id: params.teamId },
        data: { status: "LOCKED" },
      });
    }
  });

  return NextResponse.json({ success: true, message: "Joined team." });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const userId = session.user.id;
  const membership = await prisma.teamMember.findFirst({
    where: { userId, teamId: params.teamId },
    include: { team: { include: { members: true } } },
  });

  if (!membership) {
    return NextResponse.json({ error: "You are not in this team." }, { status: 404 });
  }
  if (membership.team.status === "LOCKED") {
    return NextResponse.json(
      { error: "Teams cannot be changed once locked. Contact a staff member." },
      { status: 403 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.delete({ where: { id: membership.id } });
    await tx.user.update({
      where: { id: userId },
      data: { registrationStatus: "ACTIVE" },
    });
    if (membership.isCaptain && membership.team.members.length === 1) {
      await tx.team.delete({ where: { id: params.teamId } });
    }
  });

  return NextResponse.json({ success: true, message: "Left team." });
}
