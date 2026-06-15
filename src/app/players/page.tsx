// src/app/players/page.tsx
// Public player list — shows all registered players with flag, rank, element, team status.

import { prisma } from "@/lib/prisma";

export const revalidate = 30;

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

const STATUS_LABEL: Record<string, string> = {
  PENDING:    "Registered",
  ACTIVE:     "Element assigned",
  TEAMED:     "In a team",
  WITHDRAWN:  "Withdrawn",
};

function getFlagEmoji(countryCode: string) {
  // Convert country code to flag emoji (e.g. "SG" → 🇸🇬)
  return countryCode
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65))
    .join("");
}

export default async function PlayersPage() {
  const players = await prisma.user.findMany({
    where: {
      registrationStatus: { in: ["PENDING", "ACTIVE", "TEAMED"] },
    },
    select: {
      id: true,
      osuId: true,
      osuUsername: true,
      osuRank: true,
      osuCountry: true,
      osuAvatar: true,
      element: true,
      registrationStatus: true,
      registeredAt: true,
    },
    orderBy: { registeredAt: "asc" },
  });

  const counts = {
    total: players.length,
    pending: players.filter((p) => p.registrationStatus === "PENDING").length,
    active: players.filter((p) => p.registrationStatus === "ACTIVE").length,
    teamed: players.filter((p) => p.registrationStatus === "TEAMED").length,
  };

  return (
    <div style={{ paddingTop: 56 }}>
      <div className="page-section" style={{ paddingBottom: 32 }}>
        <div className="eyebrow">Tournament</div>
        <h2 className="section-title">Registered Players</h2>
        <p className="section-lead" style={{ marginTop: 8 }}>
          {counts.total} player{counts.total !== 1 ? "s" : ""} registered
          {counts.teamed > 0 && ` · ${counts.teamed} in teams`}
        </p>
      </div>

      {players.length === 0 ? (
        <div className="page-section" style={{ paddingTop: 0 }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            padding: "48px 32px", textAlign: "center",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>📋</div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.85rem", color: "var(--muted)", letterSpacing: "0.1em" }}>
              No players registered yet.
            </div>
          </div>
        </div>
      ) : (
        <div className="page-section" style={{ paddingTop: 0 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
          }}>
            {players.map((player, i) => {
              const elColor = player.element ? ELEMENT_COLORS[player.element] : "var(--border)";
              const elIcon  = player.element ? ELEMENT_ICONS[player.element]  : null;

              return (
                <a
                  key={player.id}
                  href={`https://osu.ppy.sh/users/${player.osuId}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderTop: `2px solid ${elColor}`,
                    padding: "16px",
                    display: "flex", flexDirection: "column", gap: 10,
                    transition: "transform 0.2s, border-color 0.2s",
                    cursor: "pointer",
                  }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "translateY(-2px)";
                      el.style.borderColor = elColor + "88";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "translateY(0)";
                      el.style.borderColor = "var(--border)";
                      el.style.borderTopColor = elColor;
                    }}
                  >
                    {/* Top row — avatar + name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Seed number */}
                      <div style={{
                        fontFamily: "Cinzel, serif", fontSize: "0.6rem", fontWeight: 700,
                        color: "var(--muted)", minWidth: 20, textAlign: "right",
                        flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>

                      {/* Avatar */}
                      {player.osuAvatar ? (
                        <img
                          src={player.osuAvatar}
                          alt=""
                          style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }}
                        />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--raised)", flexShrink: 0 }} />
                      )}

                      {/* Name + flag */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {player.osuUsername}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                          {player.osuCountry && (
                            <span>{getFlagEmoji(player.osuCountry)}</span>
                          )}
                          {player.osuRank && `#${player.osuRank.toLocaleString()}`}
                        </div>
                      </div>
                    </div>

                    {/* Bottom row — element + status */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      {/* Element badge */}
                      {player.element ? (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 5,
                          background: elColor + "18",
                          border: `1px solid ${elColor}44`,
                          padding: "3px 8px",
                        }}>
                          <span style={{ fontSize: "0.75rem" }}>{elIcon}</span>
                          <span style={{
                            fontFamily: "Cinzel, serif", fontSize: "0.55rem", fontWeight: 700,
                            letterSpacing: "0.15em", textTransform: "uppercase", color: elColor,
                          }}>
                            {player.element.charAt(0) + player.element.slice(1).toLowerCase()}
                          </span>
                        </div>
                      ) : (
                        <div style={{
                          fontFamily: "Cinzel, serif", fontSize: "0.55rem", fontWeight: 600,
                          letterSpacing: "0.15em", textTransform: "uppercase",
                          color: "var(--muted)", padding: "3px 8px",
                          border: "1px solid var(--border)",
                        }}>
                          Unrolled
                        </div>
                      )}

                      {/* Team status */}
                      <div style={{
                        fontFamily: "Cinzel, serif", fontSize: "0.52rem", fontWeight: 600,
                        letterSpacing: "0.12em", textTransform: "uppercase",
                        color: player.registrationStatus === "TEAMED" ? "#4ade80" : "var(--muted)",
                      }}>
                        {STATUS_LABEL[player.registrationStatus ?? ""] ?? ""}
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
