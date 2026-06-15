"use client";
// src/components/AuthButtons.tsx
// Login / logout / register buttons. These need to be client components
// because they trigger NextAuth sign-in and API calls.

import { signIn, signOut } from "next-auth/react";
import { useState } from "react";

// osu! circle icon
function OsuIcon() {
  return <span className="osu-icon" aria-hidden="true" />;
}

// ── Nav: login or logout depending on session ──
export function NavAuth({
  loggedIn,
  username,
}: {
  loggedIn: boolean;
  username?: string | null;
}) {
  if (loggedIn) {
    return (
      <div className="nav-end">
        <span
          style={{
            fontSize: "0.78rem",
            color: "var(--text)",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <OsuIcon />
          {username}
        </span>
        <button className="btn-sm btn-gold" onClick={() => signOut()}>
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="nav-end">
      <button className="btn-sm btn-osu" onClick={() => signIn("osu")}>
        <OsuIcon />
        Login with osu!
      </button>
    </div>
  );
}

// ── Hero primary button ──
export function HeroAuthButton({ loggedIn }: { loggedIn: boolean }) {
  if (loggedIn) {
    return (
      <a className="btn-lg btn-lg-primary" href="#registration">
        <OsuIcon />
        Go to registration
      </a>
    );
  }
  return (
    <button className="btn-lg btn-lg-primary" onClick={() => signIn("osu")}>
      <OsuIcon />
      Login with osu!
    </button>
  );
}

// ── Registration action (in the registration section) ──
export function RegisterAction({
  loggedIn,
  status,
  registrationOpen,
}: {
  loggedIn: boolean;
  status: string | null;
  registrationOpen: boolean;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    message: string | null;
    error: string | null;
    localStatus: string | null;
  }>({ loading: false, message: null, error: null, localStatus: status });

  async function register() {
    setState((s) => ({ ...s, loading: true, error: null, message: null }));
    try {
      const res = await fetch("/api/register", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setState((s) => ({ ...s, loading: false, error: data.error ?? "Something went wrong." }));
        return;
      }
      setState({
        loading: false,
        message: data.message ?? "Registered!",
        error: null,
        localStatus: "PENDING",
      });
    } catch {
      setState((s) => ({ ...s, loading: false, error: "Network error. Try again." }));
    }
  }

  // Not logged in
  if (!loggedIn) {
    return (
      <div className="reg-callout">
        <div className="reg-callout-title">Ready to register?</div>
        <div className="reg-callout-body" style={{ marginBottom: 16 }}>
          Log in with your osu! account to sign up. Registration is individual — you
          don&apos;t need a team yet.
        </div>
        <button className="btn-lg btn-lg-primary" onClick={() => signIn("osu")}>
          <OsuIcon />
          Login with osu!
        </button>
      </div>
    );
  }

  // Logged in, already registered
  const current = state.localStatus;
  if (current && current !== "WITHDRAWN") {
    const label =
      current === "PENDING"
        ? "You're registered — waiting for the element roll."
        : current === "ACTIVE"
        ? "Element assigned. You can now form a team."
        : current === "TEAMED"
        ? "You're locked into a team. See you in the bracket."
        : "You're registered.";
    return (
      <div className="reg-callout">
        <div className="reg-callout-title">Registration status</div>
        <div className="reg-callout-body">{label}</div>
      </div>
    );
  }

  // Logged in, not registered
  return (
    <div className="reg-callout">
      <div className="reg-callout-title">Ready to register?</div>
      {state.error && (
        <div className="reg-callout-body" style={{ color: "#f87171", marginBottom: 12 }}>
          {state.error}
        </div>
      )}
      {state.message && (
        <div className="reg-callout-body" style={{ color: "#4ade80", marginBottom: 12 }}>
          {state.message}
        </div>
      )}
      {!state.message && (
        <>
          <div className="reg-callout-body" style={{ marginBottom: 16 }}>
            {registrationOpen
              ? "You're logged in. Confirm your individual registration below."
              : "Registration isn't open yet. Check back soon — you'll register here when it opens."}
          </div>
          <button
            className="btn-lg btn-lg-primary"
            onClick={register}
            disabled={!registrationOpen || state.loading}
            style={!registrationOpen || state.loading ? { opacity: 0.5, cursor: "not-allowed" } : {}}
          >
            {state.loading ? "Registering…" : "Confirm registration"}
          </button>
        </>
      )}
    </div>
  );
}
