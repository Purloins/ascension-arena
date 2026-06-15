// src/app/api/admin/mappool/[round]/route.ts
// Staff-only mappool management.
//
// GET    — get the full mappool (including hidden) for a round
// POST   — add a map to the pool (by beatmap ID or URL)
// DELETE — remove a map from the pool

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchBeatmap, parseBeatmapId } from "@/lib/osu-api";
import { Round, ModSlot } from "@prisma/client";
import { z } from "zod";

// ── Helpers ───────────────────────────────

const ROUND_MAP: Record<string, Round> = {
  qualifiers:    "QUALIFIERS",
  quarterfinals: "QUARTERFINALS",
  semifinals:    "SEMIFINALS",
  finals:        "FINALS",
};

const VALID_SLOTS = new Set<string>([
  "NM","HD","HR","DT","FM","RX","AP","EZ","EZHD","EZDT","HDDTHR","TB",
]);

function isStaff(userId: string, adminIds: string) {
  return adminIds.split(",").map((s) => s.trim()).includes(userId);
}

async function requireStaff() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const staff = await prisma.staffMember.findUnique({
    where: { userId: session.user.id },
  });
  const isAdmin = isStaff(
    session.user.id,
    process.env.ADMIN_USER_IDS ?? ""
  );

  return staff || isAdmin ? session.user.id : null;
}

async function getOrCreateMappool(round: Round) {
  return prisma.mappool.upsert({
    where: { round },
    update: {},
    create: { round, visible: false },
    include: { maps: { orderBy: [{ slot: "asc" }, { slotIndex: "asc" }] } },
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

// ── POST — add a map ──────────────────────

const AddMapSchema = z.object({
  input:     z.string().min(1),  // beatmap URL or ID
  slot:      z.string().min(1),  // e.g. "NM", "EZHD"
  slotIndex: z.number().int().min(1),
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

  const { input, slot, slotIndex } = parsed.data;
  const slotUpper = slot.toUpperCase();

  if (!VALID_SLOTS.has(slotUpper)) {
    return NextResponse.json({ error: `Invalid slot: ${slot}` }, { status: 400 });
  }

  const beatmapId = parseBeatmapId(input);
  if (!beatmapId) {
    return NextResponse.json(
      { error: "Could not parse a beatmap ID from that input." },
      { status: 400 }
    );
  }

  // Fetch beatmap info from osu! API
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

  // Check for duplicate slot+index
  const existing = await prisma.mappoolMap.findUnique({
    where: {
      mappoolId_slot_slotIndex: {
        mappoolId: mappool.id,
        slot: slotUpper as ModSlot,
        slotIndex,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: `${slotUpper}${slotIndex} is already taken. Remove it first.` },
      { status: 409 }
    );
  }

  const map = await prisma.mappoolMap.create({
    data: {
      mappoolId:   mappool.id,
      slot:        slotUpper as ModSlot,
      slotIndex,
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

// ── DELETE — remove a map ─────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { round: string } }
) {
  const userId = await requireStaff();
  if (!userId) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const round = ROUND_MAP[params.round.toLowerCase()];
  if (!round) return NextResponse.json({ error: "Unknown round." }, { status: 404 });

  const { mapId } = await request.json().catch(() => ({}));
  if (!mapId) return NextResponse.json({ error: "mapId required." }, { status: 400 });

  await prisma.mappoolMap.delete({ where: { id: mapId } }).catch(() => null);

  return NextResponse.json({ success: true });
}
