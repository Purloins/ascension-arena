// src/app/players/page.tsx
// Public player list — server component, delegates interactive cards to PlayerCard.

import { prisma } from "@/lib/prisma";
import PlayerCard from "./PlayerCard";

export const revalidate = 30;

export default async function PlayersPage() {
  const players = await prisma.user.findMany({
    where: { registrationStatus: { in: ["PENDING", "ACTIVE", "TEAMED"] } },
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

  const teamed = players.filter((p) => p.registrationStatus === "TEAMED").length;

  return (
    <div style={{ paddingTop: 56 }}>
      <div className="page-section" style={{ paddingBottom: 32 }}>
        <div className="eyebrow">Tournament</div>
        <h2 className="section-title">Registered Players</h2>
        <p className="section-lead" style={{ marginTop: 8 }}>
          {players.length} player{players.length !== 1 ? "s" : ""} registered
          {teamed > 0 && ` · ${teamed} in teams`}
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
            {players.map((player, i) => (
              <PlayerCard
                key={player.id}
                index={i}
                osuId={player.osuId}
                osuUsername={player.osuUsername}
                osuRank={player.osuRank}
                osuCountry={player.osuCountry}
                osuAvatar={player.osuAvatar}
                element={player.element}
                registrationStatus={player.registrationStatus}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
