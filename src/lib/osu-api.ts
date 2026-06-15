// src/lib/osu-api.ts
// osu! API v2 client using client credentials grant (server-side only).
// Token is cached in memory and auto-refreshed when expired.

interface TokenCache {
  accessToken: string;
  expiresAt: number; // unix ms
}

// Module-level cache — survives across requests in the same Vercel function instance
let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.OSU_CLIENT_ID;
  const clientSecret = process.env.OSU_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("OSU_CLIENT_ID or OSU_CLIENT_SECRET is not set.");
  }

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`osu! token request failed: ${res.status} — ${text}`);
  }

  const data = await res.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

// ── Public API functions ──────────────────

export interface OsuBeatmap {
  id: number;
  beatmapset_id: number;
  version: string; // difficulty name
  total_length: number;
  hit_length: number; // drain length
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
    };
  };
}

export async function fetchBeatmap(beatmapId: number): Promise<OsuBeatmap> {
  const token = await getAccessToken();

  const res = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/${beatmapId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    // Don't cache — always fetch fresh when staff adds a map
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error(`Beatmap ${beatmapId} not found.`);
    throw new Error(`osu! API error: ${res.status}`);
  }

  return res.json();
}

// Parse a beatmap ID from either a URL or a bare ID string
export function parseBeatmapId(input: string): number | null {
  const trimmed = input.trim();

  // Bare number
  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  // osu.ppy.sh/beatmapsets/xxxxx#osu/yyyyy  → we want yyyyy
  const setMatch = trimmed.match(/beatmapsets\/\d+[#/]\w+\/(\d+)/);
  if (setMatch) return Number(setMatch[1]);

  // osu.ppy.sh/beatmaps/yyyyy
  const mapMatch = trimmed.match(/beatmaps\/(\d+)/);
  if (mapMatch) return Number(mapMatch[1]);

  return null;
}
