// src/app/api/matches/[matchId]/scores/route.ts
// POST /api/matches/:id/scores — submit scores for a map pick.
// Handles targeting modifiers (±15%) and HP damage (multi-target = average).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Element } from "@prisma/client";

const TARGETING_MODIFIER = 0.15;

// Key element is weak against value element.
const WEAKNESS: Record<Element, Element> = {
  WITCH: "HUMAN",
  HUMAN: "DEMIGOD",
  DEMIGOD: "SOULWEAVER",
  SOULWEAVER: "WITCH",
};

function getTargetingModifier(attacker: Element, target: Element): number {
  if (WEAKNESS[attacker] === target) return -TARGETING_MODIFIER; // attacker weak
  if (WEAKNESS[target] === attacker) return +TARGETING_MODIFIER; // target weak
  return 0;
}

const ScoreSubmissionSchema = z.object({
  mapPickId: z.string(),
  scores: z.array(
    z.object({
      userId: z.string(),
      score: z.number().int().min(0),
      accuracy: z.number().min(0).max(100).optional(),
      mods: z.string().optional(),
      passed: z.boolean().default(true),
      targetedUserId: z.string().optional(),
    })
  ),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const staffMember = await prisma.staffMember.findUnique({
    where: { userId: session.user.id },
  });
  if (!staffMember) {
    return NextResponse.json(
      { error: "Only staff referees can submit scores." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = ScoreSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mapPickId, scores } = parsed.data;

  const mapPick = await prisma.mapPick.findFirst({
    where: { id: mapPickId, matchId: params.matchId },
  });
  if (!mapPick) {
    return NextResponse.json({ error: "Map pick not found." }, { status: 404 });
  }

  const userIds = scores.map((s) => s.userId);
  const players = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, element: true },
  });
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  const lastScores = await prisma.playerScore.findMany({
    where: { userId: { in: userIds }, mapPick: { matchId: params.matchId } },
    orderBy: { id: "desc" },
    distinct: ["userId"],
    select: { userId: true, hpAfter: true },
  });
  const hpMap: Record<string, number> = {};
  lastScores.forEach((s) => {
    if (s.hpAfter !== null) hpMap[s.userId] = s.hpAfter;
  });

  type TargetGroup = { adjustedScore: number }[];
  const targetGroups: Record<string, TargetGroup> = {};

  const resolvedScores = scores.map((s) => {
    const attackerElement = playerMap[s.userId]?.element as Element | null;
    let modifier = 0;
    if (attackerElement && s.targetedUserId) {
      const targetElement = playerMap[s.targetedUserId]?.element as Element | null;
      if (targetElement) modifier = getTargetingModifier(attackerElement, targetElement);
    }
    const adjustedScore = Math.round(s.score * (1 + modifier));
    if (s.targetedUserId) {
      (targetGroups[s.targetedUserId] ??= []).push({ adjustedScore });
    }
    return { ...s, modifier, adjustedScore };
  });

  const hpDamageMap: Record<string, number> = {};
  for (const [targetId, attackers] of Object.entries(targetGroups)) {
    const targetScore = scores.find((s) => s.userId === targetId)?.score ?? 0;
    const total = attackers.reduce(
      (sum, a) => sum + Math.max(0, a.adjustedScore - targetScore),
      0
    );
    hpDamageMap[targetId] = Math.round(total / attackers.length);
  }

  const scoreRecords = await prisma.$transaction(
    resolvedScores.map((s) => {
      const hpBefore = hpMap[s.userId] ?? null;
      const damage = hpDamageMap[s.userId] ?? 0;
      const hpAfter = hpBefore !== null ? Math.max(0, hpBefore - damage) : null;
      return prisma.playerScore.create({
        data: {
          mapPickId,
          userId: s.userId,
          score: s.score,
          accuracy: s.accuracy ?? null,
          mods: s.mods ?? null,
          passed: s.passed,
          targetedUserId: s.targetedUserId ?? null,
          targetBonus: s.modifier !== 0 ? s.modifier : null,
          adjustedScore: s.adjustedScore,
          hpBefore,
          hpAfter,
          hpDamage: damage > 0 ? damage : null,
        },
      });
    })
  );

  return NextResponse.json({
    success: true,
    scoresRecorded: scoreRecords.length,
    hpSummary: Object.entries(hpDamageMap).map(([userId, damage]) => ({
      userId,
      damage,
      hpBefore: hpMap[userId] ?? null,
      hpAfter: hpMap[userId] !== undefined ? Math.max(0, hpMap[userId] - damage) : null,
    })),
  });
}
