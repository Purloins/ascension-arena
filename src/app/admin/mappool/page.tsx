"use client";
// src/app/admin/mappool/page.tsx
// Staff mappool builder — grid of slots (A1–A12 etc.), each with ID input + mod selector.

import { useState, useEffect, useCallback } from "react";

// ── Constants ─────────────────────────────

const ROUNDS = [
  { key: "qualifiers",    label: "Qualifiers",    letter: "A" },
  { key: "quarterfinals", label: "Quarterfinals",  letter: "B" },
  { key: "semifinals",    label: "Semifinals",     letter: "C" },
  { key: "finals",        label: "Finals",         letter: "D" },
];

const MODS = ["NM","HD","HR","DT","FM","RX","AP","EZ","EZHD","EZDT","HDDTHR","TB"];

const MOD_COLORS: Record<string, string> = {
  NM:"#a78bfa", HD:"#fbbf24", HR:"#f87171", DT:"#60a5fa",
  FM:"#34d399", RX:"#f472b6", AP:"#c084fc", EZ:"#86efac",
  EZHD:"#fde68a", EZDT:"#93c5fd", HDDTHR:"#fb923c", TB:"#e2e8f0",
};

// ── Types ─────────────────────────────────

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
  drainLength: number;
  cs: number; ar: number; od: number; hp: number;
}

interface Mappool {
  id: string;
  round: string;
  visible: boolean;
  maps: MappoolMap[];
}

// State per slot in the editor
interface SlotState {
  input: string;   // beatmap ID or URL being typed
  mod: string;     // selected mod
  loading: boolean;
  error: string | null;
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// ── Main page ─────────────────────────────

export default function AdminMappoolPage() {
  const [activeRound, setActiveRound] = useState(ROUNDS[0]);
  const [mappool, setMappool] = useState<Mappool | null>(null);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // How many slots to show — staff can add more
  const [slotCount, setSlotCount] = useState(12);

  // Per-slot editor state
  const [slots, setSlots] = useState<Record<number, SlotState>>({});

  function getSlot(n: number): SlotState {
    return slots[n] ?? { input: "", mod: "NM", loading: false, error: null };
  }

  function setSlot(n: number, patch: Partial<SlotState>) {
    setSlots((prev) => ({ ...prev, [n]: { ...getSlot(n), ...patch } }));
  }

  // ── Fetch pool ─────────────────────────

  const fetchPool = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch(`/api/admin/mappool/${activeRound.key}`);
      if (!res.ok) {
        const d = await res.json();
        setGlobalError(d.error ?? "Failed to load.");
        return;
      }
      const data = await res.json();
      setMappool(data.mappool);
      // Ensure slotCount covers all existing maps
      const maxSlot = Math.max(0, ...data.mappool.maps.map((m: MappoolMap) => m.slotNumber));
      if (maxSlot >= slotCount) setSlotCount(maxSlot + 1);
    } catch { setGlobalError("Network error."); }
    finally { setLoading(false); }
  }, [activeRound, slotCount]);

  useEffect(() => {
    setSlots({});
    fetchPool();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRound]);

  // ── Save a slot ────────────────────────

  async function saveSlot(n: number) {
    const s = getSlot(n);
    if (!s.input.trim()) return;
    setSlot(n, { loading: true, error: null });
    setGlobalSuccess(null);

    try {
      const res = await fetch(`/api/admin/mappool/${activeRound.key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beatmapInput: s.input.trim(),
          slotNumber: n,
          mod: s.mod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSlot(n, { loading: false, error: data.error ?? "Failed." });
        return;
      }
      setSlot(n, { loading: false, input: "", error: null });
      setGlobalSuccess(`${activeRound.letter}${n} saved — ${data.map.artist} — ${data.map.title}`);
      fetchPool();
    } catch {
      setSlot(n, { loading: false, error: "Network error." });
    }
  }

  // ── Clear a slot ───────────────────────

  async function clearSlot(n: number) {
    if (!confirm(`Clear slot ${activeRound.letter}${n}?`)) return;
    setGlobalSuccess(null); setGlobalError(null);
    try {
      const res = await fetch(`/api/admin/mappool/${activeRound.key}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotNumber: n }),
      });
      if (!res.ok) { const d = await res.json(); setGlobalError(d.error ?? "Failed."); return; }
      setGlobalSuccess(`${activeRound.letter}${n} cleared.`);
      fetchPool();
    } catch { setGlobalError("Network error."); }
  }

  // ── Toggle visibility ──────────────────

  async function toggleVisibility() {
    if (!mappool) return;
    const next = !mappool.visible;
    try {
      const res = await fetch(`/api/admin/mappool/${activeRound.key}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: next }),
      });
      if (!res.ok) { const d = await res.json(); setGlobalError(d.error ?? "Failed."); return; }
      setMappool((p) => p ? { ...p, visible: next } : p);
      setGlobalSuccess(next ? "Pool is now public." : "Pool hidden from players.");
    } catch { setGlobalError("Network error."); }
  }

  // ── Build map lookup ───────────────────
  const mapBySlot: Record<number, MappoolMap> = {};
  mappool?.maps.forEach((m) => { mapBySlot[m.slotNumber] = m; });

  // ── Styles ─────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: "var(--raised)", border: "1px solid var(--border)",
    color: "var(--text)", padding: "8px 12px", fontSize: "0.82rem",
    outline: "none", width: "100%", fontFamily: "inherit",
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: "pointer", width: "auto",
  };

  return (
    <div style={{ paddingTop: 56, minHeight: "100vh" }}>

      {/* Header */}
      <div className="page-section" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">Staff</div>
        <h2 className="section-title">Mappool Builder</h2>
      </div>

      {/* Round tabs */}
      <div style={{
        borderBottom: "1px solid var(--border)", display: "flex",
        position: "sticky", top: 56, zIndex: 10,
        background: "rgba(6,4,13,0.97)", backdropFilter: "blur(12px)",
      }}>
        {ROUNDS.map((r) => (
          <button key={r.key} onClick={() => setActiveRound(r)} style={{
            fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 600,
            letterSpacing: "0.2em", textTransform: "uppercase",
            padding: "16px 24px", background: "transparent", border: "none",
            borderBottom: activeRound.key === r.key ? "2px solid var(--violet-l)" : "2px solid transparent",
            color: activeRound.key === r.key ? "var(--violet-l)" : "var(--muted)",
            cursor: "pointer", marginBottom: -1,
          }}>
            {r.letter} — {r.label}
          </button>
        ))}
      </div>

      <div className="page-section" style={{ paddingTop: 28 }}>

        {/* Status messages */}
        {globalError && (
          <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", padding: "12px 16px", marginBottom: 20, color: "#f87171", fontSize: "0.88rem", display: "flex", justifyContent: "space-between" }}>
            {globalError}
            <button onClick={() => setGlobalError(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
          </div>
        )}
        {globalSuccess && (
          <div style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", padding: "12px 16px", marginBottom: 20, color: "#34d399", fontSize: "0.88rem", display: "flex", justifyContent: "space-between" }}>
            {globalSuccess}
            <button onClick={() => setGlobalSuccess(null)} style={{ background: "none", border: "none", color: "#34d399", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* Visibility bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--surface)", border: "1px solid var(--border)",
          padding: "14px 20px", marginBottom: 28,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: mappool?.visible ? "#34d399" : "var(--border)",
            }} />
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", color: mappool?.visible ? "#34d399" : "var(--muted)" }}>
              {mappool?.visible ? "Public — players can see this pool" : "Hidden from players"}
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              · {mappool?.maps.length ?? 0} maps
            </span>
          </div>
          <button onClick={toggleVisibility} style={{
            fontFamily: "Cinzel, serif", fontSize: "0.6rem", fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase",
            background: mappool?.visible ? "rgba(248,113,113,0.15)" : "rgba(52,211,153,0.15)",
            border: `1px solid ${mappool?.visible ? "rgba(248,113,113,0.4)" : "rgba(52,211,153,0.4)"}`,
            color: mappool?.visible ? "#f87171" : "#34d399",
            padding: "8px 16px", cursor: "pointer",
          }}>
            {mappool?.visible ? "Hide" : "Make public"}
          </button>
        </div>

        {/* Slot grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--muted)", fontFamily: "Cinzel, serif", fontSize: "0.75rem", letterSpacing: "0.2em" }}>
            Loading…
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
              {Array.from({ length: slotCount }, (_, i) => i + 1).map((n) => {
                const existing = mapBySlot[n];
                const slotState = getSlot(n);
                const slotLabel = `${activeRound.letter}${n}`;
                const modColor = existing ? (MOD_COLORS[existing.mod] ?? "#a78bfa") : "var(--border)";

                return (
                  <div key={n} style={{
                    background: "var(--surface)",
                    border: `1px solid ${existing ? modColor + "55" : "var(--border)"}`,
                    borderTop: `2px solid ${existing ? modColor : "var(--border)"}`,
                    padding: 16,
                    transition: "border-color 0.2s",
                  }}>
                    {/* Slot header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{
                        fontFamily: "Cinzel, serif", fontSize: "0.7rem", fontWeight: 700,
                        letterSpacing: "0.15em",
                        color: existing ? modColor : "var(--muted)",
                      }}>
                        {slotLabel}
                        {existing && (
                          <span style={{
                            marginLeft: 8, fontSize: "0.6rem",
                            background: modColor,
                            color: "#0a0816",
                            padding: "1px 6px",
                          }}>
                            {existing.mod}
                          </span>
                        )}
                      </span>
                      {existing && (
                        <button onClick={() => clearSlot(n)} style={{
                          background: "none", border: "1px solid rgba(248,113,113,0.3)",
                          color: "#f87171", fontSize: "0.58rem", fontFamily: "Cinzel, serif",
                          fontWeight: 700, letterSpacing: "0.15em", padding: "3px 8px",
                          cursor: "pointer",
                        }}>
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Existing map preview */}
                    {existing && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <img
                            src={existing.coverUrl} alt=""
                            style={{ width: 60, height: 40, objectFit: "cover", opacity: 0.85, flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "0.82rem", color: "#fff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {existing.artist} — {existing.title}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              [{existing.version}] · {existing.mapper}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 4 }}>
                              ★{existing.starRating.toFixed(2)} · {existing.bpm.toFixed(0)}bpm · {formatTime(existing.drainLength)} · CS{existing.cs.toFixed(1)} AR{existing.ar.toFixed(1)} OD{existing.od.toFixed(1)} HP{existing.hp.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Input row — always visible so staff can replace */}
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexDirection: "column" }}>
                      <input
                        style={inputStyle}
                        placeholder={existing ? "Paste new ID to replace…" : "Beatmap ID or URL"}
                        value={slotState.input}
                        onChange={(e) => setSlot(n, { input: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && saveSlot(n)}
                      />
                      <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center" }}>
                        <select
                          style={{ ...selectStyle, flex: 1 }}
                          value={slotState.mod}
                          onChange={(e) => setSlot(n, { mod: e.target.value })}
                        >
                          {MODS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => saveSlot(n)}
                          disabled={slotState.loading || !slotState.input.trim()}
                          style={{
                            fontFamily: "Cinzel, serif", fontSize: "0.6rem", fontWeight: 700,
                            letterSpacing: "0.15em", textTransform: "uppercase",
                            background: slotState.loading || !slotState.input.trim()
                              ? "var(--border)" : "linear-gradient(135deg, var(--osu), #a855f7)",
                            color: "#fff", border: "none", padding: "8px 16px",
                            cursor: slotState.loading || !slotState.input.trim() ? "not-allowed" : "pointer",
                            opacity: slotState.loading || !slotState.input.trim() ? 0.5 : 1,
                            flexShrink: 0,
                          }}
                        >
                          {slotState.loading ? "…" : existing ? "Replace" : "Save"}
                        </button>
                      </div>
                      {slotState.error && (
                        <div style={{ fontSize: "0.75rem", color: "#f87171" }}>
                          {slotState.error}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add more slots button */}
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button
                onClick={() => setSlotCount((c) => c + 4)}
                style={{
                  fontFamily: "Cinzel, serif", fontSize: "0.62rem", fontWeight: 700,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--muted)", padding: "10px 24px", cursor: "pointer",
                }}
              >
                + Add more slots
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
