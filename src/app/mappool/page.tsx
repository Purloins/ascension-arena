// src/app/mappool/page.tsx
// Public mappool viewer — shows all visible pools per round with tab navigation.

import { prisma } from "@/lib/prisma";
import MappoolViewer from "./MappoolViewer";

export const revalidate = 60; // revalidate every 60s

const ROUNDS = [
  { key: "QUALIFIERS",    label: "Qualifiers" },
  { key: "QUARTERFINALS", label: "Quarterfinals" },
  { key: "SEMIFINALS",    label: "Semifinals" },
  { key: "FINALS",        label: "Finals" },
] as const;

export default async function MappoolPage() {
  const pools = await prisma.mappool.findMany({
    where: { visible: true },
    include: {
      maps: { orderBy: [{ slot: "asc" }, { slotIndex: "asc" }] },
    },
  });

  const poolsByRound = Object.fromEntries(pools.map((p) => [p.round, p]));
  const hasAny = pools.length > 0;

  return (
    <div style={{ paddingTop: 56 }}>
      <div className="page-section" style={{ paddingBottom: 24 }}>
        <div className="eyebrow">Tournament</div>
        <h2 className="section-title">Mappool</h2>
        <p className="section-lead" style={{ marginTop: 8 }}>
          Maps are revealed as each round approaches.
        </p>
      </div>

      {!hasAny ? (
        <div className="page-section" style={{ paddingTop: 0 }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            padding: "48px 32px", textAlign: "center",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>🔒</div>
            <div style={{
              fontFamily: "Cinzel, serif", fontSize: "0.85rem",
              color: "var(--muted)", letterSpacing: "0.1em",
            }}>
              No mappools have been revealed yet.
            </div>
          </div>
        </div>
      ) : (
        <MappoolViewer
          pools={poolsByRound}
          rounds={ROUNDS.map((r) => ({ ...r, available: !!poolsByRound[r.key] }))}
        />
      )}
    </div>
  );
}
