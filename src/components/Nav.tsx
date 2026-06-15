"use client";
// src/components/Nav.tsx

import { signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

function OsuIcon() {
  return <span className="osu-icon" aria-hidden="true" />;
}

function UserDropdown({ username, isAdmin }: { username: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const base: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 16px", width: "100%",
    background: "none", border: "none", cursor: "pointer",
    fontFamily: "Cinzel, serif", fontSize: "0.62rem", fontWeight: 600,
    letterSpacing: "0.18em", textTransform: "uppercase" as const,
    color: "var(--text)", textDecoration: "none", whiteSpace: "nowrap" as const,
    transition: "background 0.15s, color 0.15s",
  };

  function hoverOn(e: React.MouseEvent) {
    (e.currentTarget as HTMLElement).style.background = "var(--raised)";
    (e.currentTarget as HTMLElement).style.color = "var(--violet-l)";
  }
  function hoverOff(e: React.MouseEvent) {
    (e.currentTarget as HTMLElement).style.background = "none";
    (e.currentTarget as HTMLElement).style.color = "var(--text)";
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        display: "flex", alignItems: "center", gap: 7,
        background: "none", border: "none", cursor: "pointer",
        padding: "6px 10px", color: "var(--text)", fontSize: "0.78rem", fontWeight: 500,
        outline: open ? "1px solid var(--border)" : "none",
      }}>
        <OsuIcon />
        <span>{username}</span>
        <span style={{ fontSize: "0.5rem", color: "var(--muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "var(--surface)", border: "1px solid var(--border)",
          minWidth: 170, zIndex: 200,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          animation: "dropIn 0.12s ease",
        }}>
          <a href={`https://osu.ppy.sh/users/${username}`} target="_blank" rel="noopener noreferrer"
            style={base} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={() => setOpen(false)}>
            <span style={{ fontSize: "0.9rem" }}>👤</span>Profile
          </a>

          {isAdmin && (
            <>
              <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
              <a href="/admin/mappool" style={base} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={() => setOpen(false)}>
                <span style={{ fontSize: "0.9rem" }}>🗺️</span>Mappool
              </a>
              <a href="/admin/roll" style={base} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={() => setOpen(false)}>
                <span style={{ fontSize: "0.9rem" }}>🎲</span>Element Roll
              </a>
            </>
          )}

          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          <button style={{ ...base, color: "#f87171" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
            onClick={() => { setOpen(false); signOut(); }}>
            <span style={{ fontSize: "0.9rem" }}>🚪</span>Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Nav({
  loggedIn,
  username,
  isAdmin = false,
}: {
  loggedIn: boolean;
  username?: string | null;
  isAdmin?: boolean;
}) {
  return (
    <nav>
      <a href="/" className="logo">TWIST</a>
      <ul className="nav-links">
        <li><a href="/#registration">Register</a></li>
        <li><a href="/players">Players</a></li>
        <li><a href="/mappool">Mappool</a></li>
        <li><a href="/#elements">Elements</a></li>
        <li><a href="/#schedule">Schedule</a></li>
        <li><a href="/#faq">FAQ</a></li>
      </ul>
      <div className="nav-end">
        {loggedIn && username ? (
          <UserDropdown username={username} isAdmin={isAdmin} />
        ) : (
          <button className="btn-sm btn-osu" onClick={() => signIn("osu")}>
            <OsuIcon />Login with osu!
          </button>
        )}
      </div>
    </nav>
  );
}
