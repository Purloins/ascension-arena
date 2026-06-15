"use client";
// src/app/players/PlayerCard.tsx

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
  PENDING:   "Registered",
  ACTIVE:    "Element assigned",
  TEAMED:    "In a team",
  WITHDRAWN: "Withdrawn",
};

function getFlagEmoji(countryCode: string) {
  return countryCode.toUpperCase().split("").map((c) =>
    String.fromCodePoint(0x1f1e0 + c.charCodeAt(0) - 65)
  ).join("");
}

export interface PlayerCardProps {
  index: number;
  osuId: string | null;
  osuUsername: string | null;
  osuRank: number | null;
  osuCountry: string | null;
  osuAvatar: string | null;
  element: string | null;
  registrationStatus: string | null;
}

export default function PlayerCard({
  index,
  osuId,
  osuUsername,
  osuRank,
  osuCountry,
  osuAvatar,
  element,
  registrationStatus,
}: PlayerCardProps) {
  const elColor = element ? (ELEMENT_COLORS[element] ?? "var(--border)") : "var(--border)";
  const elIcon  = element ? ELEMENT_ICONS[element] : null;

  return (
    <a
      href={`https://osu.ppy.sh/users/${osuId}`}
      target="_blank" rel="noopener noreferrer"
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderTop: `2px solid ${elColor}`,
          padding: 16,
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
        {/* Avatar + name row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.6rem", fontWeight: 700, color: "var(--muted)", minWidth: 20, textAlign: "right", flexShrink: 0 }}>
            {index + 1}
          </div>
          {osuAvatar ? (
            <img src={osuAvatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--raised)", flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {osuUsername}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
              {osuCountry && <span>{getFlagEmoji(osuCountry)}</span>}
              {osuRank && `#${osuRank.toLocaleString()}`}
            </div>
          </div>
        </div>

        {/* Element + status row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          {element ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              background: elColor + "18", border: `1px solid ${elColor}44`,
              padding: "3px 8px",
            }}>
              <span style={{ fontSize: "0.75rem" }}>{elIcon}</span>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: elColor }}>
                {element.charAt(0) + element.slice(1).toLowerCase()}
              </span>
            </div>
          ) : (
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", padding: "3px 8px", border: "1px solid var(--border)" }}>
              Unrolled
            </div>
          )}
          <div style={{ fontFamily: "Cinzel, serif", fontSize: "0.52rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: registrationStatus === "TEAMED" ? "#4ade80" : "var(--muted)" }}>
            {STATUS_LABEL[registrationStatus ?? ""] ?? ""}
          </div>
        </div>
      </div>
    </a>
  );
}
