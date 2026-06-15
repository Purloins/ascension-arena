"use client";
// src/app/mappool/MappoolViewer.tsx
// Public viewer — tabs per round, maps ordered by slot number, grouped by mod.

import { useState } from "react";

interface MappoolMap {
  id: string;
  slotNumber: number;
  mod: string;
  beatmapId: number;
  title: string;
  artist: string;
  version: string;
  mapper: string;
  coverUrl: string;
  starRating: number;
  bpm: number;
  totalLength: number;
  drainLength: number;
  cs: number; ar: number; od: number; hp: number;
}

interface Mappool {
  id: string;
  round: string;
  maps: MappoolMap[];
}

interface Round {
  key: string;
  label: string;
  letter: string;
  available: boolean;
}

const MOD_COLORS: Record<string, string> = {
  NM:"#a78bfa", HD:"#fbbf24", HR:"#f87171", DT:"#60a5fa",
  FM:"#34d399", RX:"#f472b6", AP:"#c084fc", EZ:"#86efac",
  EZHD:"#fde68a", EZDT:"#93c5fd", HDDTHR:"#fb923c", TB:"#e2e8f0",
};

const MOD_ORDER = ["NM","HD","HR","DT","FM","RX","AP","EZ","EZHD","EZDT","HDDTHR","TB"];

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: "0.55rem", color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Cinzel, serif", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "0.8rem", color: "var(--text)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function MapCard({ map, roundLetter }: { map: MappoolMap; roundLetter: string }) {
  const color = MOD_COLORS[map.mod] ?? "#a78bfa";
  const slotLabel = `${roundLetter}${map.slotNumber}`;

  return (
    <a
      href={`https://osu.ppy.sh/beatmaps/${map.beatmapId}`}
      target="_blank" rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderTop: `2px solid ${color}`,
          overflow: "hidden",
          transition: "transform 0.2s, border-color 0.2s",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(-3px)";
          el.style.borderColor = color + "88";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(0)";
          el.style.borderColor = "var(--border)";
          el.style.borderTopColor = color;
        }}
      >
        {/* Cover */}
        <div style={{ height: 80, overflow: "hidden", position: "relative", background: "var(--raised)" }}>
          <img src={map.coverUrl} alt={map.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
          <div style={{
            position: "absolute", top: 8, left: 8,
            background: color, color: "#0a0816",
            fontFamily: "Cinzel, serif", fontSize: "0.6rem", fontWeight: 700,
            letterSpacing: "0.1em", padding: "2px 7px",
          }}>
            {slotLabel}
          </div>
          <div style={{
            position: "absolute", top: 8, right: 8,
            background: "rgba(0,0,0,0.75)", color: color,
            fontFamily: "Cinzel, serif", fontSize: "0.62rem", fontWeight: 700,
            padding: "2px 7px",
          }}>
            ★ {map.starRating.toFixed(2)}
          </div>
          <div style={{
            position: "absolute", bottom: 8, right: 8,
            background: color + "cc", color: "#0a0816",
            fontFamily: "Cinzel, serif", fontSize: "0.55rem", fontWeight: 700,
            letterSpacing: "0.1em", padding: "1px 6px",
          }}>
            {map.mod}
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>
            {map.artist} — {map.title}
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 12 }}>
            {map.version} · mapped by {map.mapper}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <StatPill label="BPM"    value={map.bpm.toFixed(0)} />
            <StatPill label="Drain"  value={formatTime(map.drainLength)} />
            <StatPill label="CS"     value={map.cs.toFixed(1)} />
            <StatPill label="AR"     value={map.ar.toFixed(1)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginTop: 6 }}>
            <StatPill label="OD" value={map.od.toFixed(1)} />
            <StatPill label="HP" value={map.hp.toFixed(1)} />
          </div>
        </div>
      </div>
    </a>
  );
}

function ModGroup({ mod, maps, roundLetter }: { mod: string; maps: MappoolMap[]; roundLetter: string }) {
  const color = MOD_COLORS[mod] ?? "#a78bfa";
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
        <span style={{ fontFamily: "Cinzel, serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color }}>{mod}</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {maps.map((m) => <MapCard key={m.id} map={m} roundLetter={roundLetter} />)}
      </div>
    </div>
  );
}

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
  const currentRound = rounds.find((r) => r.key === activeRound);

  // Group by mod
  const byMod: Record<string, MappoolMap[]> = {};
  currentPool?.maps.forEach((m) => { (byMod[m.mod] ??= []).push(m); });
  const orderedMods = MOD_ORDER.filter((m) => byMod[m]);

  return (
    <div>
      {/* Tabs */}
      <div style={{
        borderBottom: "1px solid var(--border)", display: "flex",
        position: "sticky", top: 56, zIndex: 10,
        background: "rgba(6,4,13,0.97)", backdropFilter: "blur(12px)",
      }}>
        {rounds.map((r) => (
          <button key={r.key} onClick={() => r.available && setActiveRound(r.key)} style={{
            fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 600,
            letterSpacing: "0.2em", textTransform: "uppercase",
            padding: "16px 24px", background: "transparent", border: "none",
            borderBottom: activeRound === r.key ? "2px solid var(--violet-l)" : "2px solid transparent",
            color: !r.available ? "var(--border)" : activeRound === r.key ? "var(--violet-l)" : "var(--muted)",
            cursor: r.available ? "pointer" : "default",
            marginBottom: -1,
          }}>
            {r.letter} — {r.label}
            {!r.available && <span style={{ marginLeft: 6, fontSize: "0.5rem", verticalAlign: "middle" }}>🔒</span>}
          </button>
        ))}
      </div>

      {/* Maps */}
      <div className="page-section" style={{ paddingTop: 40 }}>
        {currentPool && orderedMods.length > 0 ? (
          orderedMods.map((mod) => (
            <ModGroup key={mod} mod={mod} maps={byMod[mod]} roundLetter={currentRound?.letter ?? ""} />
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "48px 0", fontFamily: "Cinzel, serif", fontSize: "0.8rem", color: "var(--muted)", letterSpacing: "0.1em" }}>
            No maps in this pool yet.
          </div>
        )}
      </div>
    </div>
  );
}
