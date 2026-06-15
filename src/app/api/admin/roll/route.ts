// src/app/api/admin/roll/route.ts
// POST /api/admin/roll — run the element roll for all PENDING players.
// GET  /api/admin/roll — get the roll session status and results.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Element } from "@prisma/client";

function isAdmin(userId: string) {
  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}

// Seeded Fisher-Yates (LCG) so the roll is reproducible / auditable.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distributeElements(count: number): Element[] {
  const elements: Element[] = ["SOULWEAVER", "DEMIGOD", "HUMAN", "WITCH"];
  const base = Math.floor(count / 4);
  const remainder = count % 4;
  const pool: Element[] = [];
  elements.forEach((el, i) => {
    const qty = base + (i < remainder ? 1 : 0);
    for (let j = 0; j < qty; j++) pool.push(el);
  });
  return pool;
}

export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.id)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const existing = await prisma.elementRoll.findFirst({
    where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A roll has already been run or is in progress.", rollId: existing.id },
      { status: 409 }
    );
  }

  const pendingPlayers = await prisma.user.findMany({
    where: { registrationStatus: "PENDING" },
    select: { id: true, osuUsername: true },
  });
  if (pendingPlayers.length === 0) {
    return NextResponse.json({ error: "No pending players to roll." }, { status: 400 });
  }

  const seed = Date.now();
  const shuffledElements = seededShuffle(distributeElements(pendingPlayers.length), seed);
  const shuffledPlayers = seededShuffle(pendingPlayers, seed ^ 0xdeadbeef);

  const roll = await prisma.$transaction(async (tx) => {
    const rollRecord = await tx.elementRoll.create({
      data: { status: "IN_PROGRESS", startedAt: new Date(), seed: String(seed) },
    });
    const results = shuffledPlayers.map((player, i) => ({
      rollId: rollRecord.id,
      userId: player.id,
      element: shuffledElements[i],
      rolledOrder: i + 1,
    }));
    await tx.elementRollResult.createMany({ data: results });
    for (const r of results) {
      await tx.user.update({
        where: { id: r.userId },
        data: { element: r.element, registrationStatus: "ACTIVE" },
      });
    }
    await tx.elementRoll.update({
      where: { id: rollRecord.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return rollRecord;
  });

  const results = await prisma.elementRollResult.findMany({
    where: { rollId: roll.id },
    orderBy: { rolledOrder: "asc" },
  });

  return NextResponse.json({
    success: true,
    rollId: roll.id,
    seed,
    totalPlayers: pendingPlayers.length,
    results: results.map((r) => ({ order: r.rolledOrder, userId: r.userId, element: r.element })),
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.id)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const roll = await prisma.elementRoll.findFirst({
    orderBy: { createdAt: "desc" },
    include: { results: { orderBy: { rolledOrder: "asc" } } },
  });
  if (!roll) {
    return NextResponse.json({ roll: null, message: "No roll has been run yet." });
  }

  const userIds = roll.results.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, osuUsername: true, osuCountry: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return NextResponse.json({
    roll: {
      id: roll.id,
      status: roll.status,
      seed: roll.seed,
      startedAt: roll.startedAt,
      completedAt: roll.completedAt,
      totalResults: roll.results.length,
    },
    results: roll.results.map((r) => ({
      order: r.rolledOrder,
      userId: r.userId,
      osuUsername: userMap[r.userId]?.osuUsername ?? "Unknown",
      country: userMap[r.userId]?.osuCountry ?? null,
      element: r.element,
      rolledAt: r.rolledAt,
    })),
  });
}
