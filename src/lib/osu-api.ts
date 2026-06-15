// src/lib/osu-api.ts
// osu! API v2 client + mod stat calculation.
// AR/OD/CS/BPM/length: ported from PEG mappool-builder.html.
// Star rating: fetched from POST /api/v2/beatmaps/{id}/attributes with mods bitmask
//              so osu!'s own difficulty calculator handles it accurately.

// ── Token cache ───────────────────────────

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) return tokenCache.accessToken;

  const clientId = process.env.OSU_CLIENT_ID;
  const clientSecret = process.env.OSU_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("OSU_CLIENT_ID or OSU_CLIENT_SECRET not set.");

  const res = await fetch("https://osu.ppy.sh/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: Number(clientId),
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "public",
    }),
  });
  if (!res.ok) throw new Error(`osu! token request failed: ${res.status}`);
  const data = await res.json();
  tokenCache = { accessToken: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return tokenCache.accessToken;
}

// ── Types ─────────────────────────────────

export interface OsuBeatmap {
  id: number;
  beatmapset_id: number;
  version: string;
  total_length: number;
  hit_length: number;
  bpm: number;
  cs: number;
  ar: number;
  accuracy: number; // OD
  drain: number;    // HP
  difficulty_rating: number;
  beatmapset: {
    title: string;
    artist: string;
    creator: string;
    covers: {
      cover: string;
      "cover@2x": string;
      card: string;
      "card@2x": string;
      list: string;
    };
  };
}

export interface ModdedStats {
  starRating:  number;
  bpm:         number;
  totalLength: number;
  drainLength: number;
  cs:          number;
  ar:          number;
  od:          number;
  hp:          number;
}

// ── Mod bitmasks ──────────────────────────
// Same values as PEG mappool-builder.html

const MOD_EZ = 2;
const MOD_HD = 8;
const MOD_HR = 16;
const MOD_DT = 64;
const MOD_HT = 256;

const MOD_BITMASKS: Record<string, number> = {
  NM:     0,
  HD:     MOD_HD,
  HR:     MOD_HR,
  DT:     MOD_DT,
  FM:     0,       // FreeMod: store NM base stats (HR shown separately in UI)
  RX:     0,       // Relax: no difficulty stat changes
  AP:     0,       // Autopilot: no difficulty stat changes
  EZ:     MOD_EZ,
  EZHD:   MOD_EZ | MOD_HD,
  EZDT:   MOD_EZ | MOD_DT,
  HDDTHR: MOD_HD | MOD_DT | MOD_HR,
  TB:     0,
};

// ── Star rating via osu! attributes API ───
// POST /api/v2/beatmaps/{id}/attributes returns osu!'s own SR calculation

async function fetchModdedStarRating(beatmapId: number, mods: number): Promise<number | null> {
  // NM — just use the base SR from the beatmap object, no need for an extra call
  if (mods === 0) return null;

  const token = await getAccessToken();
  const res = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/${beatmapId}/attributes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ mods, ruleset: "osu" }),
    cache: "no-store",
  });

  if (!res.ok) return null; // fall back to base SR if this fails
  const data = await res.json();
  return data?.attributes?.star_rating ?? null;
}

// ── Stat calculation (ported from PEG) ────

export async function applyMods(beatmap: OsuBeatmap, modSlot: string): Promise<ModdedStats> {
  const mods = MOD_BITMASKS[modSlot.toUpperCase()] ?? 0;

  const isEZ = (mods & MOD_EZ) !== 0;
  const isHR = (mods & MOD_HR) !== 0;
  const isDT = (mods & MOD_DT) !== 0;
  const isHT = (mods & MOD_HT) !== 0;

  let cs = beatmap.cs;
  let ar = beatmap.ar;
  let od = beatmap.accuracy;
  let hp = beatmap.drain;
  let bpm = beatmap.bpm;
  let totalLength = beatmap.total_length;
  let drainLength = beatmap.hit_length;

  // ── EZ (applied first) ──
  if (isEZ) {
    cs = Math.max(cs / 2, 0);
    ar = Math.max(ar / 2, 0);
    od = Math.max(od / 2, 0);
    hp = Math.max(hp / 2, 0);
  }

  // ── HR ──
  if (isHR) {
    cs = Math.min(cs * 1.3, 10);
    ar = Math.min(ar * 1.4, 10);
    od = Math.min(od * 1.4, 10);
    hp = Math.min(hp * 1.4, 10);
  }

  // ── Speed multiplier (DT / HT) ──
  const speedMultiplier = isDT ? 1.5 : isHT ? 0.75 : 1.0;

  if (speedMultiplier !== 1.0) {
    // AR — convert to ms hit window, scale by speed, convert back
    let arMs = ar < 5 ? 1800 - ar * 120 : 1200 - (ar - 5) * 150;
    arMs /= speedMultiplier;
    ar = arMs > 1200
      ? (1800 - arMs) / 120
      : (1200 - arMs) / 150 + 5;
    ar = Math.min(Math.max(ar, 0), 11);

    // OD — convert to ms hit window, scale by speed, convert back
    let odMs = 79.5 - od * 6;
    odMs /= speedMultiplier;
    od = (79.5 - odMs) / 6;
    od = Math.min(Math.max(od, 0), 11);

    bpm          = bpm * speedMultiplier;
    totalLength  = totalLength / speedMultiplier;
    drainLength  = drainLength / speedMultiplier;
  }

  // ── Star rating — fetch from osu! attributes API ──
  // This is the only accurate way to get modded SR (especially for HR, HDDTHR, EZDT etc.)
  const moddedSR = await fetchModdedStarRating(beatmap.id, mods);
  const starRating = moddedSR ?? beatmap.difficulty_rating;

  return {
    starRating:  Math.round(starRating  * 100) / 100,
    bpm:         Math.round(bpm         * 100) / 100,
    totalLength: Math.round(totalLength),
    drainLength: Math.round(drainLength),
    cs:          Math.round(cs          * 100) / 100,
    ar:          Math.round(ar          * 100) / 100,
    od:          Math.round(od          * 100) / 100,
    hp:          Math.round(hp          * 100) / 100,
  };
}

// ── Beatmap fetch ─────────────────────────

export async function fetchBeatmap(beatmapId: number): Promise<OsuBeatmap> {
  const token = await getAccessToken();
  const res = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/${beatmapId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Beatmap ${beatmapId} not found.`);
    throw new Error(`osu! API error: ${res.status}`);
  }
  return res.json();
}

// ── URL / ID parser ───────────────────────

export function parseBeatmapId(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const setMatch = trimmed.match(/beatmapsets\/\d+[#/]\w+\/(\d+)/);
  if (setMatch) return Number(setMatch[1]);
  const mapMatch = trimmed.match(/beatmaps\/(\d+)/);
  if (mapMatch) return Number(mapMatch[1]);
  return null;
}
