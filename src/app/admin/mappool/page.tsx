"use client";
// src/app/admin/mappool/page.tsx
// Staff mappool builder — auto-saves 800ms after you stop typing.

import { useState, useEffect, useCallback, useRef } from "react";

const ROUNDS = [
  { key: "qualifiers",    label: "Qualifiers",    letter: "A" },
  { key: "quarterfinals", label: "Quarterfinals",  letter: "B" },
  { key: "semifinals",    label: "Semifinals",     letter: "C" },
  { key: "finals",        label: "Finals",         letter: "D" },
];

const MODS = ["NM","HD","HR","DT","FM","RX","AP","EZ","EZHD","EZDT","HDDTHR","TB"];

const MOD_COLORS: Record<string, string> = {
  NM:"#60a5fa", HD:"#fbbf24", HR:"#f87171", DT:"#a78bfa",
  FM:"#34d399", RX:"#f472b6", AP:"#c084fc", EZ:"#86efac",
  EZHD:"#fde68a", EZDT:"#93c5fd", HDDTHR:"#fb923c", TB:"#e2e8f0",
};

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

// Save state per slot
type SaveState = "idle" | "typing" | "saving" | "saved" | "error";

interface SlotState {
  input: string;
  mod: string;
  saveState: SaveState;
  errorMsg: string | null;
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// ── SaveIndicator ─────────────────────────

function SaveIndicator({ state, error }: { state: SaveState; error: string | null }) {
  if (state === "idle") return null;
  const configs: Record<SaveState, { color: string; label: string }> = {
    idle:   { color: "var(--muted)", label: "" },
    typing: { color: "var(--muted)", label: "Waiting…" },
    saving: { color: "#60a5fa", label: "Fetching from osu!…" },
    saved:  { color: "#34d399", label: "✓ Saved" },
    error:  { color: "#f87171", label: error ?? "Error" },
  };
  const { color, label } = configs[state];
  return (
    <div style={{ fontSize: "0.72rem", color, marginTop: 4, minHeight: 18 }}>
      {label}
    </div>
  );
}

// ── Main page ─────────────────────────────

export default function AdminMappoolPage() {
  const [activeRound, setActiveRound] = useState(ROUNDS[0]);
  const [mappool, setMappool] = useState<Mappool | null>(null);
  const [loading, setLoading] = useState(false);
  const [globalMsg, setGlobalMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [slotCount, setSlotCount] = useState(12);
  const [slots, setSlots] = useState<Record<number, SlotState>>({});

  // Debounce timers per slot
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  function getSlot(n: number): SlotState {
    return slots[n] ?? { input: "", mod: "NM", saveState: "idle", errorMsg: null };
  }

  function patchSlot(n: number, patch: Partial<SlotState>) {
    setSlots((prev) => ({ ...prev, [n]: { ...getSlot(n), ...patch } }));
  }

  // ── Fetch pool ─────────────────────────

  const fetchPool = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/mappool/${activeRound.key}`);
      if (!res.ok) { const d = await res.json(); setGlobalMsg({ text: d.error ?? "Failed.", type: "err" }); return; }
      const data = await res.json();
      setMappool(data.mappool);
      const maxSlot = Math.max(0, ...data.mappool.maps.map((m: MappoolMap) => m.slotNumber));
      if (maxSlot >= slotCount) setSlotCount(maxSlot + 4);
    } catch { setGlobalMsg({ text: "Network error.", type: "err" }); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRound]);

  useEffect(() => {
    setSlots({});
    // Clear all pending timers on round change
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    fetchPool();
  }, [fetchPool]);

  // ── Auto-save a slot ───────────────────

  async function saveSlot(n: number, input: string, mod: string) {
    if (!input.trim()) return;
    patchSlot(n, { saveState: "saving" });

    try {
      const res = await fetch(`/api/admin/mappool/${activeRound.key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beatmapInput: input.trim(), slotNumber: n, mod }),
      });
      const data = await res.json();
      if (!res.ok) {
        patchSlot(n, { saveState: "error", errorMsg: data.error ?? "Failed." });
        return;
      }
      patchSlot(n, { saveState: "saved", input: "", errorMsg: null });
      // Reset to idle after 2s
      setTimeout(() => patchSlot(n, { saveState: "idle" }), 2000);
      fetchPool();
    } catch {
      patchSlot(n, { saveState: "error", errorMsg: "Network error." });
    }
  }

  // Debounced input handler
  function handleInput(n: number, value: string) {
    const current = getSlot(n);
    patchSlot(n, { input: value, saveState: value.trim() ? "typing" : "idle" });

    // Clear existing timer
    if (timers.current[n]) clearTimeout(timers.current[n]);
    if (!value.trim()) return;

    // Set new timer — fire 800ms after user stops typing
    timers.current[n] = setTimeout(() => {
      const mod = getSlot(n).mod || current.mod;
      saveSlot(n, value, mod);
    }, 800);
  }

  // Mod change — if there's already a saved map, immediately re-save with new mod
  async function handleModChange(n: number, mod: string) {
    patchSlot(n, { mod });
    const existing = mapBySlot[n];
    if (existing) {
      // Re-save with existing beatmap ID and new mod
      await saveSlot(n, String(existing.beatmapId), mod);
    }
  }

  // ── Clear a slot ───────────────────────

  async function clearSlot(n: number) {
    if (!confirm(`Clear slot ${activeRound.letter}${n}?`)) return;
    setGlobalMsg(null);
    try {
      const res = await fetch(`/api/admin/mappool/${activeRound.key}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotNumber: n }),
      });
      if (!res.ok) { const d = await res.json(); setGlobalMsg({ text: d.error ?? "Failed.", type: "err" }); return; }
      patchSlot(n, { input: "", saveState: "idle", errorMsg: null });
      setGlobalMsg({ text: `${activeRound.letter}${n} cleared.`, type: "ok" });
      fetchPool();
    } catch { setGlobalMsg({ text: "Network error.", type: "err" }); }
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
      if (!res.ok) { const d = await res.json(); setGlobalMsg({ text: d.error ?? "Failed.", type: "err" }); return; }
      setMappool((p) => p ? { ...p, visible: next } : p);
      setGlobalMsg({ text: next ? "Pool is now public." : "Pool hidden.", type: "ok" });
    } catch { setGlobalMsg({ text: "Network error.", type: "err" }); }
  }

  const mapBySlot: Record<number, MappoolMap> = {};
  mappool?.maps.forEach((m) => { mapBySlot[m.slotNumber] = m; });

  const inputStyle: React.CSSProperties = {
    background: "var(--raised)", border: "1px solid var(--border)",
    color: "var(--text)", padding: "8px 12px", fontSize: "0.82rem",
    outline: "none", width: "100%", fontFamily: "inherit",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{ paddingTop: 56, minHeight: "100vh" }}>

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

        {/* Global message */}
        {globalMsg && (
          <div style={{
            background: globalMsg.type === "ok" ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
            border: `1px solid ${globalMsg.type === "ok" ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
            color: globalMsg.type === "ok" ? "#34d399" : "#f87171",
            padding: "12px 16px", marginBottom: 20, fontSize: "0.88rem",
            display: "flex", justifyContent: "space-between",
          }}>
            {globalMsg.text}
            <button onClick={() => setGlobalMsg(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* Visibility bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--surface)", border: "1px solid var(--border)",
          padding: "14px 20px", marginBottom: 28,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: mappool?.visible ? "#34d399" : "var(--border)" }} />
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", color: mappool?.visible ? "#34d399" : "var(--muted)" }}>
              {mappool?.visible ? "Public — players can see this pool" : "Hidden from players"}
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>· {mappool?.maps.length ?? 0} maps</span>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {Array.from({ length: slotCount }, (_, i) => i + 1).map((n) => {
                const existing = mapBySlot[n];
                const s = getSlot(n);
                const slotLabel = `${activeRound.letter}${n}`;
                const modColor = existing ? (MOD_COLORS[existing.mod] ?? "#a78bfa") : "var(--border)";

                // Border colour reacts to save state
                const borderColor = s.saveState === "saving" ? "#60a5fa"
                  : s.saveState === "saved" ? "#34d399"
                  : s.saveState === "error" ? "#f87171"
                  : s.saveState === "typing" ? "var(--violet-l)"
                  : existing ? modColor + "55" : "var(--border)";

                return (
                  <div key={n} style={{
                    background: "var(--surface)",
                    border: `1px solid ${borderColor}`,
                    borderTop: `2px solid ${existing ? modColor : s.saveState === "typing" ? "var(--violet-l)" : "var(--border)"}`,
                    padding: 16,
                    transition: "border-color 0.25s",
                  }}>
                    {/* Slot label + clear */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontFamily: "Cinzel, serif", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.15em", color: existing ? modColor : "var(--muted)" }}>
                        {slotLabel}
                        {existing && (
                          <span style={{ marginLeft: 8, fontSize: "0.58rem", background: modColor, color: "#0a0816", padding: "1px 6px" }}>
                            {existing.mod}
                          </span>
                        )}
                      </span>
                      {existing && (
                        <button onClick={() => clearSlot(n)} style={{
                          background: "none", border: "1px solid rgba(248,113,113,0.3)",
                          color: "#f87171", fontSize: "0.58rem", fontFamily: "Cinzel, serif",
                          fontWeight: 700, letterSpacing: "0.15em", padding: "3px 8px", cursor: "pointer",
                        }}>
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Existing map info */}
                    {existing && (
                      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        <img src={existing.coverUrl} alt="" style={{ width: 60, height: 38, objectFit: "cover", opacity: 0.85, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "0.82rem", color: "#fff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {existing.artist} — {existing.title}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            [{existing.version}] · {existing.mapper}
                          </div>
                          <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>
                            ★{existing.starRating.toFixed(2)} · {existing.bpm.toFixed(0)}bpm · {formatTime(existing.drainLength)} · CS{existing.cs.toFixed(1)} AR{existing.ar.toFixed(1)} OD{existing.od.toFixed(1)} HP{existing.hp.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Input + mod row */}
                    <input
                      style={{
                        ...inputStyle,
                        borderColor: s.saveState === "typing" ? "var(--violet-l)"
                          : s.saveState === "error" ? "#f87171"
                          : "var(--border)",
                        marginBottom: 8,
                      }}
                      placeholder={existing ? "Paste new ID to replace…" : "Beatmap ID or URL"}
                      value={s.input}
                      onChange={(e) => handleInput(n, e.target.value)}
                    />
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select
                        style={{
                          ...inputStyle, width: "auto", flex: 1, cursor: "pointer",
                          borderColor: "var(--border)",
                        }}
                        value={s.mod}
                        onChange={(e) => handleModChange(n, e.target.value)}
                      >
                        {MODS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <SaveIndicator state={s.saveState} error={s.errorMsg} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button onClick={() => setSlotCount((c) => c + 4)} style={{
                fontFamily: "Cinzel, serif", fontSize: "0.62rem", fontWeight: 700,
                letterSpacing: "0.2em", textTransform: "uppercase",
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--muted)", padding: "10px 24px", cursor: "pointer",
              }}>
                + Add more slots
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
