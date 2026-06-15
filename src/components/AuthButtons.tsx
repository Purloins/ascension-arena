"use client";
// src/components/AuthButtons.tsx

import { signIn } from "next-auth/react";
import { useState } from "react";

function OsuIcon() {
  return <span className="osu-icon" aria-hidden="true" />;
}

export function HeroAuthButton({ loggedIn }: { loggedIn: boolean }) {
  if (loggedIn) {
    return (
      <a className="btn-lg btn-lg-primary" href="#registration">
        <OsuIcon />Go to registration
      </a>
    );
  }
  return (
    <button className="btn-lg btn-lg-primary" onClick={() => signIn("osu")}>
      <OsuIcon />Login with osu!
    </button>
  );
}

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
      setState({ loading: false, message: data.message ?? "Registered!", error: null, localStatus: "PENDING" });
    } catch {
      setState((s) => ({ ...s, loading: false, error: "Network error. Try again." }));
    }
  }

  if (!loggedIn) {
    return (
      <div className="reg-callout">
        <div className="reg-callout-title">Ready to register?</div>
        <div className="reg-callout-body" style={{ marginBottom: 16 }}>
          Log in with your osu! account to sign up. Registration is individual — no team needed yet.
        </div>
        <button className="btn-lg btn-lg-primary" onClick={() => signIn("osu")}>
          <OsuIcon />Login with osu!
        </button>
      </div>
    );
  }

  const current = state.localStatus;
  if (current && current !== "WITHDRAWN") {
    const label =
      current === "PENDING"   ? "You're registered — waiting for the element roll." :
      current === "ACTIVE"    ? "Element assigned. You can now form a team." :
      current === "TEAMED"    ? "You're locked into a team. See you in the bracket." :
                                "You're registered.";
    return (
      <div className="reg-callout">
        <div className="reg-callout-title">Registration status</div>
        <div className="reg-callout-body">{label}</div>
      </div>
    );
  }

  return (
    <div className="reg-callout">
      <div className="reg-callout-title">Ready to register?</div>
      {state.error && (
        <div style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: 10 }}>{state.error}</div>
      )}
      {state.message && (
        <div style={{ color: "#4ade80", fontSize: "0.85rem", marginBottom: 10 }}>{state.message}</div>
      )}
      {!state.message && (
        <>
          <div className="reg-callout-body" style={{ marginBottom: 16 }}>
            {registrationOpen
              ? "You're logged in. Confirm your individual registration below."
              : "Registration is currently closed."}
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
