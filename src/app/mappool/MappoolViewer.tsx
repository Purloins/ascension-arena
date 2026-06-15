"use client";
// src/app/mappool/MappoolViewer.tsx
// Interactive viewer — tab per round, maps grouped by slot.

import { useState } from "react";

// ── Types ─────────────────────────────────

interface MappoolMap {
  id: string;
  slot: string;
  slotIndex: number;
  beatmapId: number;
  beatmapsetId: number;
  title: string;
  artist: string;
  version: string;
  mapper: string;
  coverUrl: string;
  starRating: number;
  bpm: number;
  totalLength: number;
  drainLength: number;
  cs: number;
  ar: number;
  od: number;
  hp: number;
}

interface Mappool {
  id: string;
  round: string;
  maps: MappoolMap[];
}

interface Round {
  key: string;
  label: string;
  available: boolean;
}

// ── Helpers ───────────────────────────────

// Colour per slot
const SLOT_COLORS: Record<string, string> = {
  NM:     "#a78bfa",
  HD:     "#fbbf24",
  HR:     "#f87171",
  DT:     "#60a5fa",
  FM:     "#34d399",
  RX:     "#f472b6",
  AP:     "#c084fc",
  EZ:     "#86efac",
  EZHD:   "#fde68a",
  EZDT:   "#93c5fd",
  HDDTHR: "#fb923c",
  TB:     "#e2e8f0",
};

const SLOT_ORDER = ["NM","HD","HR","DT","FM","RX","AP","EZ","EZHD","EZDT","HDDTHR","TB"];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: "0.58rem", color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Cinzel, serif", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "0.82rem", color: "var(--text)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ── Map card ──────────────────────────────

function MapCard({ map }: { map: MappoolMap }) {
  const color = SLOT_COLORS[map.slot] ?? "#a78bfa";
  const slotLabel = `${map.slot}${map.slotIndex}`;
  const osuUrl = `https://osu.ppy.sh/beatmaps/${map.beatmapId}`;

  return (
    <a
      href={osuUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div style={{
        background: "var(--surface)",
        border: `1px solid var(--border)`,
        borderTop: `2px solid ${color}`,
        overflow: "hidden",
        transition: "border-color 0.2s, transform 0.2s",
        cursor: "pointer",
      }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = color;
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLDivElement).style.borderTopColor = color;
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Cover image */}
        <div style={{
          height: 80, overflow: "hidden", position: "relative",
          background: "var(--raised)",
        }}>
          <img
            src={map.coverUrl}
            alt={map.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }}
          />
          {/* Slot badge */}
          <div style={{
            position: "absolute", top: 8, left: 8,
            background: color,
            color: "#0a0816",
            fontFamily: "Cinzel, serif", fontSize: "0.62rem", fontWeight: 700,
            letterSpacing: "0.12em",
            padding: "2px 8px",
          }}>
            {slotLabel}
          </div>
          {/* Star rating */}
          <div style={{
            position: "absolute", top: 8, right: 8,
            background: "rgba(0,0,0,0.7)",
            color: color,
            fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 700,
            padding: "2px 8px",
          }}>
            ★ {map.starRating.toFixed(2)}
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: "12px 14px" }}>
          <div style={{
            fontSize: "0.88rem", fontWeight: 600, color: "#fff",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            marginBottom: 2,
          }}>
            {map.artist} — {map.title}
          </div>
          <div style={{
            fontSize: "0.75rem", color: "var(--muted)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            marginBottom: 12,
          }}>
            {map.version} · mapped by {map.mapper}
          </div>

          {/* Stats row */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8, paddingTop: 10,
            borderTop: "1px solid var(--border)",
          }}>
            <StatPill label="BPM"    value={map.bpm.toFixed(0)} />
            <StatPill label="Length" value={formatTime(map.drainLength)} />
            <StatPill label="CS"     value={map.cs.toFixed(1)} />
            <StatPill label="AR"     value={map.ar.toFixed(1)} />
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8, marginTop: 8,
          }}>
            <StatPill label="OD" value={map.od.toFixed(1)} />
            <StatPill label="HP" value={map.hp.toFixed(1)} />
          </div>
        </div>
      </div>
    </a>
  );
}

// ── Slot group ────────────────────────────

function SlotGroup({ slot, maps }: { slot: string; maps: MappoolMap[] }) {
  const color = SLOT_COLORS[slot] ?? "#a78bfa";
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "Cinzel, serif", fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.25em", textTransform: "uppercase", color,
        }}>
          {slot}
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 14,
      }}>
        {maps.map((m) => <MapCard key={m.id} map={m} />)}
      </div>
    </div>
  );
}

// ── Main viewer ───────────────────────────

export default function MappoolViewer({
  pools,
  rounds,
}: {
  pools: Record<string, Mappool>;
  rounds: Round[];
}) {
  const available = rounds.filter((r) => r.available);
  const [activeRound, setActiveRound] = useState(available[0]?.key ?? "");

  const currentPool = pools[activeRound];
  const mapsGrouped: Record<string, MappoolMap[]> = {};

  if (currentPool) {
    for (const map of currentPool.maps) {
      (mapsGrouped[map.slot] ??= []).push(map);
    }
  }

  // Sort slots by canonical order
  const orderedSlots = SLOT_ORDER.filter((s) => mapsGrouped[s]);

  return (
    <div>
      {/* Round tabs */}
      <div style={{
        borderBottom: "1px solid var(--border)",
        display: "flex", gap: 0,
        position: "sticky", top: 56, zIndex: 10,
        background: "rgba(6,4,13,0.95)", backdropFilter: "blur(12px)",
      }}>
        {rounds.map((r) => (
          <button
            key={r.key}
            onClick={() => r.available && setActiveRound(r.key)}
            style={{
              fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 600,
              letterSpacing: "0.2em", textTransform: "uppercase",
              padding: "16px 24px",
              background: "transparent", border: "none",
              borderBottom: activeRound === r.key
                ? "2px solid var(--violet-l)"
                : "2px solid transparent",
              color: !r.available
                ? "var(--border)"
                : activeRound === r.key
                ? "var(--violet-l)"
                : "var(--muted)",
              cursor: r.available ? "pointer" : "default",
              transition: "color 0.2s",
              marginBottom: -1,
            }}
          >
            {r.label}
            {!r.available && (
              <span style={{ marginLeft: 6, fontSize: "0.5rem", verticalAlign: "middle" }}>🔒</span>
            )}
          </button>
        ))}
      </div>

      {/* Maps */}
      <div className="page-section" style={{ paddingTop: 40 }}>
        {currentPool && orderedSlots.length > 0 ? (
          orderedSlots.map((slot) => (
            <SlotGroup key={slot} slot={slot} maps={mapsGrouped[slot]} />
          ))
        ) : (
          <div style={{
            textAlign: "center", padding: "48px 0",
            fontFamily: "Cinzel, serif", fontSize: "0.8rem",
            color: "var(--muted)", letterSpacing: "0.1em",
          }}>
            No maps in this pool yet.
          </div>
        )}
      </div>
    </div>
  );
}
