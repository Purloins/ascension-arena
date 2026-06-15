"use client";
// src/app/admin/roll/page.tsx
// Admin element rolling — shows pending players, lets admin run the roll,
// and displays results afterwards.

import { useState, useEffect } from "react";

const ELEMENT_COLORS: Record<string, string> = {
  SOULWEAVER: "#9333ea",
  DEMIGOD:    "#16a34a",
  HUMAN:      "#db2777",
  WITCH:      "#c026d3",
};

const ELEMENT_ICONS: Record<string, string> = {
  SOULWEAVER: "🔮",
  DEMIGOD:    "⚡",
  HUMAN:      "🎲",
  WITCH:      "🧪",
};

interface RollResult {
  order: number;
  userId: string;
  osuUsername: string;
  country: string | null;
  element: string;
  rolledAt: string;
}

interface RollSession {
  id: string;
  status: string;
  seed: string;
  startedAt: string;
  completedAt: string;
  totalResults: number;
}

interface PendingPlayer {
  id: string;
  osuUsername: string;
  osuCountry: string | null;
  osuRank: number | null;
  osuAvatar: string | null;
}

function getFlagEmoji(code: string) {
  return code.toUpperCase().split("").map((c) =>
    String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65)
  ).join("");
}

export default function AdminRollPage() {
  const [pendingPlayers, setPendingPlayers] = useState<PendingPlayer[]>([]);
  const [rollSession, setRollSession]       = useState<RollSession | null>(null);
  const [rollResults, setRollResults]       = useState<RollResult[]>([]);
  const [loading, setLoading]               = useState(true);
  const [rolling, setRolling]               = useState(false);
  const [msg, setMsg]                       = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [filterEl, setFilterEl]             = useState<string>("ALL");

  // Load existing roll session + pending players
  async function loadData() {
    setLoading(true);
    try {
      // Check for existing roll
      const rollRes = await fetch("/api/admin/roll");
      if (rollRes.ok) {
        const data = await rollRes.json();
        if (data.roll) {
          setRollSession(data.roll);
          setRollResults(data.results ?? []);
        }
      }

      // Load pending players
      const playersRes = await fetch("/api/players?limit=200");
      if (playersRes.ok) {
        const data = await playersRes.json();
        setPendingPlayers(
          data.players.filter((p: { registrationStatus: string } & PendingPlayer) =>
            p.registrationStatus === "PENDING"
          )
        );
      }
    } catch {
      setMsg({ text: "Failed to load data.", type: "err" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function runRoll() {
    if (!confirm(
      `Roll elements for ${pendingPlayers.length} pending player${pendingPlayers.length !== 1 ? "s" : ""}?\n\n` +
      `This cannot be undone. Elements will be assigned randomly and players will move to ACTIVE status.`
    )) return;

    setRolling(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/roll", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error ?? "Roll failed.", type: "err" });
        return;
      }
      setMsg({ text: `✓ Roll complete — ${data.totalPlayers} players assigned elements. Seed: ${data.seed}`, type: "ok" });
      loadData();
    } catch {
      setMsg({ text: "Network error.", type: "err" });
    } finally {
      setRolling(false);
    }
  }

  // Count elements in results
  const elementCounts = rollResults.reduce((acc, r) => {
    acc[r.element] = (acc[r.element] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredResults = filterEl === "ALL"
    ? rollResults
    : rollResults.filter((r) => r.element === filterEl);

  const inputStyle: React.CSSProperties = {
    fontFamily: "Cinzel, serif", fontSize: "0.6rem", fontWeight: 700,
    letterSpacing: "0.18em", textTransform: "uppercase",
    border: "none", cursor: "pointer", padding: "8px 20px", transition: "opacity 0.2s",
  };

  return (
    <div style={{ paddingTop: 56, minHeight: "100vh" }}>
      <div className="page-section" style={{ paddingBottom: 0 }}>
        <div className="eyebrow">Staff</div>
        <h2 className="section-title">Element Roll</h2>
      </div>

      <div className="page-section" style={{ paddingTop: 28 }}>

        {/* Message */}
        {msg && (
          <div style={{
            background: msg.type === "ok" ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
            border: `1px solid ${msg.type === "ok" ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
            color: msg.type === "ok" ? "#34d399" : "#f87171",
            padding: "12px 16px", marginBottom: 24,
            fontSize: "0.88rem", lineHeight: 1.6,
            display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
          }}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", flexShrink: 0 }}>✕</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--muted)", fontFamily: "Cinzel, serif", fontSize: "0.75rem", letterSpacing: "0.2em" }}>
            Loading…
          </div>
        ) : (
          <>
            {/* Roll panel */}
            {!rollSession ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>

                {/* Pending players */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: 28 }}>
                  <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 20 }}>
                    Pending Players — {pendingPlayers.length}
                  </div>
                  {pendingPlayers.length === 0 ? (
                    <div style={{ color: "var(--muted)", fontSize: "0.88rem", fontStyle: "italic" }}>
                      No pending players. Players need to register first.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
                      {pendingPlayers.map((p) => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                          {p.osuAvatar && (
                            <img src={p.osuAvatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {p.osuUsername}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                              {p.osuCountry && getFlagEmoji(p.osuCountry)} {p.osuRank ? `#${p.osuRank.toLocaleString()}` : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Roll action */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--muted)" }}>
                    Run the Roll
                  </div>

                  <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.7 }}>
                    Elements are distributed as evenly as possible (~25% each) then assigned randomly using a seeded shuffle. The seed is generated from the current timestamp — display it on stream for transparency.
                  </p>

                  <div style={{ background: "var(--raised)", border: "1px solid var(--border)", padding: "12px 16px" }}>
                    <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
                      Element distribution for {pendingPlayers.length} players
                    </div>
                    {(["SOULWEAVER","DEMIGOD","HUMAN","WITCH"] as const).map((el) => {
                      const count = Math.floor(pendingPlayers.length / 4) + (["SOULWEAVER","DEMIGOD","HUMAN","WITCH"].indexOf(el) < pendingPlayers.length % 4 ? 1 : 0);
                      const color = ELEMENT_COLORS[el];
                      return (
                        <div key={el} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: "0.85rem" }}>{ELEMENT_ICONS[el]}</span>
                          <span style={{ fontFamily: "Cinzel, serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", color, minWidth: 90 }}>
                            {el.charAt(0) + el.slice(1).toLowerCase()}
                          </span>
                          <div style={{ flex: 1, height: 4, background: "var(--border)", position: "relative" }}>
                            <div style={{ position: "absolute", inset: 0, width: pendingPlayers.length ? `${(count / pendingPlayers.length) * 100}%` : "0%", background: color, transition: "width 0.3s" }} />
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)", minWidth: 24, textAlign: "right" }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={runRoll}
                    disabled={rolling || pendingPlayers.length === 0}
                    style={{
                      ...inputStyle,
                      background: rolling || pendingPlayers.length === 0
                        ? "var(--border)"
                        : "linear-gradient(135deg, var(--osu), #a855f7)",
                      color: "#fff",
                      opacity: rolling || pendingPlayers.length === 0 ? 0.5 : 1,
                      cursor: rolling || pendingPlayers.length === 0 ? "not-allowed" : "pointer",
                      padding: "14px",
                      fontSize: "0.68rem",
                    }}
                  >
                    {rolling ? "Rolling…" : `🎲 Run Element Roll (${pendingPlayers.length} players)`}
                  </button>

                  {pendingPlayers.length === 0 && (
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>
                      No pending players to roll for.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Roll already completed */
              <div style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.25)", padding: "20px 24px", marginBottom: 32, display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#34d399", marginBottom: 8 }}>
                    Roll Completed
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.7 }}>
                    {rollSession.totalResults} players rolled · Seed: <strong style={{ color: "var(--text)", fontFamily: "monospace" }}>{rollSession.seed}</strong>
                    <br />Completed: {new Date(rollSession.completedAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {Object.entries(elementCounts).map(([el, count]) => (
                    <div key={el} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.2rem" }}>{ELEMENT_ICONS[el]}</div>
                      <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.6rem", fontWeight: 700, color: ELEMENT_COLORS[el], letterSpacing: "0.1em" }}>
                        {el.charAt(0) + el.slice(1).toLowerCase()}
                      </div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {rollResults.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                  <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--muted)" }}>
                    Results — {filteredResults.length} players
                  </div>
                  {/* Filter by element */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {["ALL", "SOULWEAVER", "DEMIGOD", "HUMAN", "WITCH"].map((el) => (
                      <button key={el} onClick={() => setFilterEl(el)} style={{
                        fontFamily: "Cinzel, serif", fontSize: "0.55rem", fontWeight: 700,
                        letterSpacing: "0.15em", textTransform: "uppercase",
                        padding: "4px 10px", border: "1px solid",
                        borderColor: filterEl === el
                          ? (el === "ALL" ? "var(--violet-l)" : ELEMENT_COLORS[el])
                          : "var(--border)",
                        background: filterEl === el
                          ? (el === "ALL" ? "rgba(167,139,250,0.1)" : ELEMENT_COLORS[el] + "18")
                          : "transparent",
                        color: filterEl === el
                          ? (el === "ALL" ? "var(--violet-l)" : ELEMENT_COLORS[el])
                          : "var(--muted)",
                        cursor: "pointer",
                      }}>
                        {el === "ALL" ? "All" : ELEMENT_ICONS[el] + " " + el.charAt(0) + el.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                  {filteredResults.map((r) => {
                    const color = ELEMENT_COLORS[r.element];
                    return (
                      <div key={r.userId} style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderLeft: `3px solid ${color}`,
                        padding: "12px 14px",
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                        <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)", minWidth: 24, textAlign: "right", flexShrink: 0 }}>
                          {r.order}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {r.osuUsername}
                          </div>
                          {r.country && (
                            <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                              {getFlagEmoji(r.country)}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                          <span style={{ fontSize: "1rem" }}>{ELEMENT_ICONS[r.element]}</span>
                          <span style={{ fontFamily: "Cinzel, serif", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.12em", color, textTransform: "uppercase" }}>
                            {r.element.charAt(0) + r.element.slice(1).toLowerCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
