"use client";
// src/components/Nav.tsx
// Shared navigation bar — rendered on every page via layout.

import { signIn, signOut } from "next-auth/react";

function OsuIcon() {
  return <span className="osu-icon" aria-hidden="true" />;
}

export default function Nav({
  loggedIn,
  username,
}: {
  loggedIn: boolean;
  username?: string | null;
}) {
  return (
    <nav>
      <a href="/" className="logo">Ascension Arena</a>
      <ul className="nav-links">
        <li><a href="/#registration">Register</a></li>
        <li><a href="/mappool">Mappool</a></li>
        <li><a href="/#elements">Elements</a></li>
        <li><a href="/#targeting">Targeting</a></li>
        <li><a href="/#schedule">Schedule</a></li>
        <li><a href="/#faq">FAQ</a></li>
      </ul>
      <div className="nav-end">
        {loggedIn ? (
          <>
            <span style={{
              fontSize: "0.78rem", color: "var(--text)", fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <OsuIcon />{username}
            </span>
            <button className="btn-sm btn-gold" onClick={() => signOut()}>Log out</button>
          </>
        ) : (
          <button className="btn-sm btn-osu" onClick={() => signIn("osu")}>
            <OsuIcon />Login with osu!
          </button>
        )}
      </div>
    </nav>
  );
}
