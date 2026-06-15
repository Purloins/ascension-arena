"use client";
// src/app/admin/mappool/page.tsx
// Staff-only mappool builder. Add maps by URL/ID, remove them, toggle visibility.

import { useState, useEffect, useCallback } from "react";

const ROUNDS = [
  { key: "qualifiers",    label: "Qualifiers" },
  { key: "quarterfinals", label: "Quarterfinals" },
  { key: "semifinals",    label: "Semifinals" },
  { key: "finals",        label: "Finals" },
];

const SLOTS = ["NM","HD","HR","DT","FM","RX","AP","EZ","EZHD","EZDT","HDDTHR","TB"];

const SLOT_COLORS: Record<string, string> = {
  NM:"#a78bfa", HD:"#fbbf24", HR:"#f87171", DT:"#60a5fa",
  FM:"#34d399", RX:"#f472b6", AP:"#c084fc", EZ:"#86efac",
  EZHD:"#fde68a", EZDT:"#93c5fd", HDDTHR:"#fb923c", TB:"#e2e8f0",
};

interface MappoolMap {
  id: string;
  slot: string;
  slotIndex: number;
  beatmapId: number;
  title: string;
  artist: string;
  version: string;
  mapper: string;
  coverUrl: string;
  starRating: number;
  bpm: number;
  drainLength: number;
  cs: number; ar: number; od: number; hp: number;
}

interface Mappool {
  id: string;
  round: string;
  visible: boolean;
  maps: MappoolMap[];
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function AdminMappoolPage() {
  const [activeRound, setActiveRound] = useState("qualifiers");
  const [mappool, setMappool] = useState<Mappool | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [slot, setSlot] = useState("NM");
  const [slotIndex, setSlotIndex] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPool = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mappool/${activeRound}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to load mappool.");
        setMappool(null);
        return;
      }
      const data = await res.json();
      setMappool(data.mappool);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [activeRound]);

  useEffect(() => { fetchPool(); }, [fetchPool]);

  async function addMap() {
    if (!input.trim()) return;
    setAdding(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/admin/mappool/${activeRound}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim(), slot, slotIndex }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to add map."); return; }
      setSuccess(`Added ${data.map.artist} — ${data.map.title} [${data.map.version}]`);
      setInput("");
      setSlotIndex((i) => i + 1);
      fetchPool();
    } catch { setError("Network error."); }
    finally { setAdding(false); }
  }

  async function removeMap(mapId: string, label: string) {
    if (!confirm(`Remove ${label}?`)) return;
    setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/admin/mappool/${activeRound}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed."); return; }
      setSuccess("Map removed.");
      fetchPool();
    } catch { setError("Network error."); }
  }

  async function toggleVisibility() {
    if (!mappool) return;
    const next = !mappool.visible;
    try {
      const res = await fetch(`/api/admin/mappool/${activeRound}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: next }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed."); return; }
      setMappool((p) => p ? { ...p, visible: next } : p);
      setSuccess(next ? "Mappool is now public." : "Mappool hidden from players.");
    } catch { setError("Network error."); }
  }

  const grouped: Record<string, MappoolMap[]> = {};
  mappool?.maps.forEach((m) => { (grouped[m.slot] ??= []).push(m); });
  const orderedSlots = SLOTS.filter((s) => grouped[s]);

  const inputStyle = {
    background: "var(--raised)", border: "1px solid var(--border)",
    color: "var(--text)", padding: "10px 14px", fontSize: "0.85rem",
    outline: "none", width: "100%",
  };

  const labelStyle = {
    fontFamily: "Cinzel, serif", fontSize: "0.58rem", fontWeight: 700,
    letterSpacing: "0.25em", textTransform: "uppercase" as const,
    color: "var(--muted)", display: "block", marginBottom: 6,
  };

  return (
    <div style={{ paddingTop: 56 }}>
      <div className="page-section" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">Staff</div>
        <h2 className="section-title">Mappool Builder</h2>
      </div>

      {/* Round tabs */}
      <div style={{
        borderBottom: "1px solid var(--border)", display: "flex",
        position: "sticky", top: 56, zIndex: 10,
        background: "rgba(6,4,13,0.95)", backdropFilter: "blur(12px)",
      }}>
        {ROUNDS.map((r) => (
          <button key={r.key} onClick={() => setActiveRound(r.key)} style={{
            fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 600,
            letterSpacing: "0.2em", textTransform: "uppercase",
            padding: "16px 24px", background: "transparent", border: "none",
            borderBottom: activeRound === r.key ? "2px solid var(--violet-l)" : "2px solid transparent",
            color: activeRound === r.key ? "var(--violet-l)" : "var(--muted)",
            cursor: "pointer", marginBottom: -1,
          }}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="page-section" style={{ paddingTop: 32 }}>
        {/* Status messages */}
        {error && (
          <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", padding: "12px 16px", marginBottom: 20, color: "#f87171", fontSize: "0.88rem" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", padding: "12px 16px", marginBottom: 20, color: "#34d399", fontSize: "0.88rem" }}>
            {success}
          </div>
        )}

        {/* Visibility + add form */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, marginBottom: 40 }}>

          {/* Add map form */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: 24 }}>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 20 }}>
              Add a map
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Beatmap URL or ID</label>
                <input
                  style={inputStyle}
                  placeholder="https://osu.ppy.sh/beatmapsets/123#osu/456 or 456"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMap()}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Slot</label>
                  <select
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={slot}
                    onChange={(e) => { setSlot(e.target.value); setSlotIndex(1); }}
                  >
                    {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Index (NM1, NM2…)</label>
                  <input
                    style={inputStyle}
                    type="number" min={1} max={20}
                    value={slotIndex}
                    onChange={(e) => setSlotIndex(Number(e.target.value))}
                  />
                </div>
              </div>

              <button
                onClick={addMap}
                disabled={adding || !input.trim()}
                style={{
                  fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 700,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  background: adding || !input.trim() ? "var(--border)" : "linear-gradient(135deg, var(--osu), #a855f7)",
                  color: "#fff", border: "none", padding: "12px",
                  cursor: adding || !input.trim() ? "not-allowed" : "pointer",
                  opacity: adding || !input.trim() ? 0.6 : 1,
                }}
              >
                {adding ? "Fetching from osu!…" : `Add to ${slot}${slotIndex}`}
              </button>
            </div>
          </div>

          {/* Visibility panel */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--muted)" }}>
              Visibility
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6 }}>
              {mappool?.visible
                ? "This pool is live — players can see it."
                : "This pool is hidden from players."}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px",
              background: mappool?.visible ? "rgba(52,211,153,0.08)" : "rgba(0,0,0,0.2)",
              border: `1px solid ${mappool?.visible ? "rgba(52,211,153,0.3)" : "var(--border)"}`,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: mappool?.visible ? "#34d399" : "var(--border)",
              }} />
              <span style={{ fontSize: "0.78rem", color: mappool?.visible ? "#34d399" : "var(--muted)" }}>
                {mappool?.visible ? "Public" : "Hidden"}
              </span>
            </div>
            <button
              onClick={toggleVisibility}
              style={{
                fontFamily: "Cinzel, serif", fontSize: "0.62rem", fontWeight: 700,
                letterSpacing: "0.18em", textTransform: "uppercase",
                background: mappool?.visible ? "rgba(248,113,113,0.15)" : "rgba(52,211,153,0.15)",
                border: `1px solid ${mappool?.visible ? "rgba(248,113,113,0.4)" : "rgba(52,211,153,0.4)"}`,
                color: mappool?.visible ? "#f87171" : "#34d399",
                padding: "10px", cursor: "pointer",
              }}
            >
              {mappool?.visible ? "Hide from players" : "Make public"}
            </button>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>
              {mappool?.maps.length ?? 0} map{mappool?.maps.length !== 1 ? "s" : ""} in this pool
            </div>
          </div>
        </div>

        {/* Existing maps */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontFamily: "Cinzel, serif", fontSize: "0.75rem", letterSpacing: "0.2em" }}>
            Loading…
          </div>
        ) : orderedSlots.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontFamily: "Cinzel, serif", fontSize: "0.75rem", letterSpacing: "0.2em" }}>
            No maps yet. Add the first one above.
          </div>
        ) : (
          orderedSlots.map((s) => (
            <div key={s} style={{ marginBottom: 32 }}>
              {/* Slot header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: SLOT_COLORS[s] ?? "#a78bfa", boxShadow: `0 0 8px ${SLOT_COLORS[s] ?? "#a78bfa"}` }} />
                <span style={{ fontFamily: "Cinzel, serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: SLOT_COLORS[s] ?? "#a78bfa" }}>{s}</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              {/* Map rows */}
              {grouped[s].map((m) => (
                <div key={m.id} style={{
                  display: "grid", gridTemplateColumns: "56px 1fr auto",
                  alignItems: "center", gap: 14, padding: "10px 14px",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  marginBottom: 4,
                }}>
                  {/* Cover thumb */}
                  <img src={m.coverUrl} alt="" style={{ width: 56, height: 36, objectFit: "cover", opacity: 0.8 }} />

                  {/* Info */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontFamily: "Cinzel, serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", background: SLOT_COLORS[s] ?? "#a78bfa", color: "#0a0816", padding: "1px 6px" }}>{m.slot}{m.slotIndex}</span>
                      <span style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 600 }}>{m.artist} — {m.title}</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      [{m.version}] · {m.mapper} · ★{m.starRating.toFixed(2)} · {m.bpm.toFixed(0)}bpm · {formatTime(m.drainLength)} · CS{m.cs.toFixed(1)} AR{m.ar.toFixed(1)} OD{m.od.toFixed(1)} HP{m.hp.toFixed(1)}
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeMap(m.id, `${m.slot}${m.slotIndex} — ${m.title}`)}
                    style={{
                      fontFamily: "Cinzel, serif", fontSize: "0.58rem", fontWeight: 700,
                      letterSpacing: "0.15em", textTransform: "uppercase",
                      background: "transparent", border: "1px solid rgba(248,113,113,0.3)",
                      color: "#f87171", padding: "6px 12px", cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
