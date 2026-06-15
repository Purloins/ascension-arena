// src/app/api/admin/mappool/[round]/route.ts
// Staff-only mappool management.
// GET    — full pool for a round (including hidden)
// POST   — add/update a map by slot number
// DELETE — remove a map by slot number

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchBeatmap, parseBeatmapId } from "@/lib/osu-api";
import { Round } from "@prisma/client";
import { z } from "zod";

const ROUND_MAP: Record<string, Round> = {
  qualifiers:    "QUALIFIERS",
  quarterfinals: "QUARTERFINALS",
  semifinals:    "SEMIFINALS",
  finals:        "FINALS",
};

const VALID_MODS = new Set([
  "NM","HD","HR","DT","FM","RX","AP","EZ","EZHD","EZDT","HDDTHR","TB",
]);

async function requireStaff() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  if (adminIds.includes(session.user.id)) return session.user.id;

  const staff = await prisma.staffMember.findUnique({
    where: { userId: session.user.id },
  });
  return staff ? session.user.id : null;
}

async function getOrCreateMappool(round: Round) {
  return prisma.mappool.upsert({
    where: { round },
    update: {},
    create: { round, visible: false },
    include: { maps: { orderBy: { slotNumber: "asc" } } },
  });
}

// ── GET ───────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { round: string } }
) {
  const userId = await requireStaff();
  if (!userId) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const round = ROUND_MAP[params.round.toLowerCase()];
  if (!round) return NextResponse.json({ error: "Unknown round." }, { status: 404 });

  const mappool = await getOrCreateMappool(round);
  return NextResponse.json({ mappool });
}

// ── POST — add or update a slot ───────────

const AddMapSchema = z.object({
  beatmapInput: z.string().min(1),
  slotNumber:   z.number().int().min(1).max(99),
  mod:          z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { round: string } }
) {
  const userId = await requireStaff();
  if (!userId) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const round = ROUND_MAP[params.round.toLowerCase()];
  if (!round) return NextResponse.json({ error: "Unknown round." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const parsed = AddMapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { beatmapInput, slotNumber, mod } = parsed.data;
  const modUpper = mod.toUpperCase();

  if (!VALID_MODS.has(modUpper)) {
    return NextResponse.json({ error: `Invalid mod: ${mod}` }, { status: 400 });
  }

  const beatmapId = parseBeatmapId(beatmapInput);
  if (!beatmapId) {
    return NextResponse.json(
      { error: "Could not parse a beatmap ID from that input." },
      { status: 400 }
    );
  }

  let beatmap;
  try {
    beatmap = await fetchBeatmap(beatmapId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "osu! API error." },
      { status: 502 }
    );
  }

  const mappool = await getOrCreateMappool(round);

  // Upsert — if slot already has a map, replace it
  const map = await prisma.mappoolMap.upsert({
    where: { mappoolId_slotNumber: { mappoolId: mappool.id, slotNumber } },
    update: {
      mod: modUpper,
      beatmapId:   beatmap.id,
      beatmapsetId: beatmap.beatmapset_id,
      title:       beatmap.beatmapset.title,
      artist:      beatmap.beatmapset.artist,
      version:     beatmap.version,
      mapper:      beatmap.beatmapset.creator,
      coverUrl:    beatmap.beatmapset.covers["cover@2x"] ?? beatmap.beatmapset.covers.cover,
      starRating:  beatmap.difficulty_rating,
      bpm:         beatmap.bpm,
      totalLength: beatmap.total_length,
      drainLength: beatmap.hit_length,
      cs:          beatmap.cs,
      ar:          beatmap.ar,
      od:          beatmap.accuracy,
      hp:          beatmap.drain,
    },
    create: {
      mappoolId:   mappool.id,
      slotNumber,
      mod:         modUpper,
      beatmapId:   beatmap.id,
      beatmapsetId: beatmap.beatmapset_id,
      title:       beatmap.beatmapset.title,
      artist:      beatmap.beatmapset.artist,
      version:     beatmap.version,
      mapper:      beatmap.beatmapset.creator,
      coverUrl:    beatmap.beatmapset.covers["cover@2x"] ?? beatmap.beatmapset.covers.cover,
      starRating:  beatmap.difficulty_rating,
      bpm:         beatmap.bpm,
      totalLength: beatmap.total_length,
      drainLength: beatmap.hit_length,
      cs:          beatmap.cs,
      ar:          beatmap.ar,
      od:          beatmap.accuracy,
      hp:          beatmap.drain,
    },
  });

  return NextResponse.json({ success: true, map }, { status: 201 });
}

// ── DELETE — remove a slot ────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { round: string } }
) {
  const userId = await requireStaff();
  if (!userId) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const round = ROUND_MAP[params.round.toLowerCase()];
  if (!round) return NextResponse.json({ error: "Unknown round." }, { status: 404 });

  const { slotNumber } = await request.json().catch(() => ({}));
  if (!slotNumber) return NextResponse.json({ error: "slotNumber required." }, { status: 400 });

  const mappool = await prisma.mappool.findUnique({ where: { round } });
  if (!mappool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });

  await prisma.mappoolMap.deleteMany({
    where: { mappoolId: mappool.id, slotNumber },
  });

  return NextResponse.json({ success: true });
}
