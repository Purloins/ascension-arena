// src/app/page.tsx
// Homepage — server component. Reads session + registration status,
// renders the tournament site, and delegates interactive buttons to client components.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavAuth, HeroAuthButton, RegisterAction } from "@/components/AuthButtons";

export default async function Home() {
  const session = await auth();
  const loggedIn = !!session?.user;
  const username = session?.user?.name ?? null;

  // Pull registration status if logged in
  let status: string | null = null;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { registrationStatus: true },
    });
    status = user?.registrationStatus ?? null;
  }

  const registrationOpen = process.env.NEXT_PUBLIC_REGISTRATION_OPEN === "true";

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="logo">Ascension Arena</div>
        <ul className="nav-links">
          <li><a href="#registration">Register</a></li>
          <li><a href="#elements">Elements</a></li>
          <li><a href="#targeting">Targeting</a></li>
          <li><a href="/mappool">Mappool</a></li>
          <li><a href="#schedule">Schedule</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <NavAuth loggedIn={loggedIn} username={username} />
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-tag">
            <div className="hero-tag-dot" />
            LAN Confirmed — November 2026
          </div>
          <h1 className="hero-title">Ascension<br /><em>Arena</em></h1>
          <p className="hero-desc">
            An osu! team tournament unlike anything that&apos;s been run before.
            Your element is randomly assigned. Your team is formed around it.
            Matches run on HP — not Best Of.
          </p>
          <div className="hero-actions">
            <HeroAuthButton loggedIn={loggedIn} />
            <a className="btn-lg btn-lg-ghost" href="#registration">How it works</a>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-card">
            <div className="hero-card-title">Tournament at a glance</div>
            <div className="stat-grid">
              <div className="stat-cell">
                <div className="stat-val">3 vs 3</div>
                <div className="stat-key">Team format (2v2 allowed)</div>
              </div>
              <div className="stat-cell">
                <div className="stat-val">4</div>
                <div className="stat-key">Playable elements</div>
              </div>
              <div className="stat-cell">
                <div className="stat-val">LAN</div>
                <div className="stat-key">In-person event</div>
              </div>
              <div className="stat-cell">
                <div className="stat-val">Nov 2026</div>
                <div className="stat-key">Target date</div>
                <div className="stat-tbd">Exact date TBD</div>
              </div>
            </div>
            <div className="hero-beta-note">
              <div className="hero-beta-note-icon">⚗️</div>
              <div className="hero-beta-note-text">
                <strong>Beta testing is open.</strong> This concept has never been run
                before. We need players to help test the HP system and element abilities
                before the main event.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BETA STRIP */}
      <div className="beta-strip">
        <div className="beta-strip-text">
          <span>⚗️</span>
          Rules and values are under active testing and will change. We need testers —
          your feedback directly shapes the final ruleset.
        </div>
        <button className="beta-strip-cta">Sign up to test</button>
      </div>

      {/* REGISTRATION */}
      <section className="page-section" id="registration">
        <div className="reg-section">
          <div>
            <div className="eyebrow">Registration</div>
            <h2 className="section-title">How sign-ups work</h2>
            <p className="section-lead">This isn&apos;t how most tournaments do it. Read this before registering.</p>

            <div className="reg-steps">
              <div className="reg-step">
                <div className="step-num">1</div>
                <div>
                  <div className="step-title">Everyone registers alone</div>
                  <div className="step-desc">No pre-made teams. Sign up individually through your osu! account. <strong>Don&apos;t bring a team yet</strong> — that comes later.</div>
                </div>
              </div>
              <div className="reg-step">
                <div className="step-num">2</div>
                <div>
                  <div className="step-title">Registrations lock</div>
                  <div className="step-desc">Once the window closes, the player list is final. No late entries.</div>
                </div>
              </div>
              <div className="reg-step">
                <div className="step-num">3</div>
                <div>
                  <div className="step-title">Element roll — live on Twitch</div>
                  <div className="step-desc">A stream goes live where <em>every player&apos;s element is assigned at random</em>. You&apos;ll get one of four: Soulweaver, Demigod, Human, or Witch. <strong>You cannot request or trade elements.</strong></div>
                </div>
              </div>
              <div className="reg-step">
                <div className="step-num">4</div>
                <div>
                  <div className="step-title">1-week team formation window</div>
                  <div className="step-desc">After elements are revealed, you have <em>one week</em> to find 1–2 other players and form a team. Teams of 2 and 3 are both valid.</div>
                </div>
              </div>
              <div className="reg-step">
                <div className="step-num">5</div>
                <div>
                  <div className="step-title">Tournament begins</div>
                  <div className="step-desc">Teams lock in, the bracket seeds, and matches start. Targeting <em>November 2026</em>.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="reg-aside">
            <RegisterAction loggedIn={loggedIn} status={status} registrationOpen={registrationOpen} />
            <div className="reg-callout">
              <div className="reg-callout-title">Team size</div>
              <div className="reg-callout-body">
                Standard teams are <strong>3 players</strong>. You may enter as a team of <strong>2</strong> if you&apos;re confident — but you&apos;ll face full 3-player squads. HP is split per active player, so a duo gets more HP each but is outnumbered on picks.<br /><br />
                You <strong>cannot</strong> register solo.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HP SYSTEM */}
      <div className="hp-section" id="hp">
        <div className="hp-inner">
          <div>
            <div className="eyebrow">Scoring</div>
            <h2 className="section-title">HP, not Best Of</h2>
            <p className="section-lead" style={{ maxWidth: "100%" }}>
              Each team has a shared HP pool, divided equally among active players. Score
              differences between players deal HP damage to the losing side. Run the other
              team to zero and you win.
            </p>
            <p style={{ marginTop: 12, fontSize: "0.92rem", color: "var(--muted)", lineHeight: 1.7 }}>
              HP values are tuned per round and are still being adjusted in beta. Below is a
              worked example using a hypothetical Round 1 pool of <strong style={{ color: "var(--text)" }}>1,200,000</strong>.
            </p>
          </div>
          <div>
            <div className="hp-visual">
              <div className="hp-row">
                <span className="hp-label">3-player team</span>
                <div className="hp-bar-wrap"><div className="hp-bar" style={{ width: "66%" }} /></div>
                <span className="hp-val">400k / player</span>
              </div>
              <div className="hp-row">
                <span className="hp-label">2-player team</span>
                <div className="hp-bar-wrap"><div className="hp-bar" style={{ width: "100%" }} /></div>
                <span className="hp-val">600k / player</span>
              </div>
            </div>
            <div className="hp-note">
              If a player is forced to sit out (e.g. after losing a Soulweaver duel), their HP
              slice is pulled from the active pool for those 2 picks. They return at <strong style={{ color: "var(--text)" }}>50% of their original HP</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* ELEMENTS */}
      <section className="page-section" id="elements">
        <div className="eyebrow">Elements</div>
        <h2 className="section-title">The four classes</h2>
        <p className="section-lead">Randomly assigned to every player after registration. Each has one unique ability per match, unless noted.</p>

        <div className="elements-wrap">
          <div className="el-card el-soul">
            <div className="el-header"><div className="el-pip" /><div className="el-name">Soulweaver</div></div>
            <p className="el-flavour">&quot;Have you ever played osu! with your life on the line?&quot;</p>
            <div className="el-ability">
              Challenge any opposing player to a <strong>1v1 on the current map</strong>. The challenged player gets a <strong>1.5× score bonus</strong>.<br /><br />
              Whoever loses <strong>sits out for the next 2 picks</strong> — their HP slice leaves the active pool during that time. After 2 picks they return, but at <strong>50% of their original HP</strong>.
            </div>
            <div className="el-foot"><span className="el-tag">Once per match</span></div>
          </div>

          <div className="el-card el-demi">
            <div className="el-header"><div className="el-pip" /><div className="el-name">Demigod</div></div>
            <p className="el-flavour">Your teammates step back. You go alone.</p>
            <div className="el-ability">
              Declare before a pick that you&apos;re going <strong>solo</strong>. Your teammates sit this one out — it&apos;s you versus the full opposing lineup.<br /><br />
              Your score is multiplied based on how many opponents are still alive:<br />
              <strong>3 alive → ×3.5 · 2 alive → ×2.5 · 1 alive → ×1.5</strong>
            </div>
            <div className="el-foot"><span className="el-tag">Once per match</span></div>
            <p className="el-wip">Full description still being finalised.</p>
          </div>

          <div className="el-card el-human">
            <div className="el-header"><div className="el-pip" /><div className="el-name">Human</div></div>
            <p className="el-flavour">&quot;Kakegurui masho!&quot; — Let&apos;s gamble.</p>
            <div className="el-ability">
              Before every pick, call a number between <strong>1 and 100</strong>, then do a <strong>!roll</strong>. Exact match → you enter <strong>Lucky 🍀 state</strong> and your score gets a <strong>×77.7% bonus</strong>.<br /><br />
              You get <strong>2 rolls per pick</strong>. Once Lucky, rolling stops. Whether Lucky lasts the full match or one pick is still being tested.
            </div>
            <div className="el-foot">
              <span className="el-tag">2 rolls per pick</span>
              <span className="el-tag">Lucky duration: TBD</span>
            </div>
          </div>

          <div className="el-card el-witch">
            <div className="el-header"><div className="el-pip" /><div className="el-name">Witch</div></div>
            <p className="el-flavour">Swap their mods. Make the map harder for them.</p>
            <div className="el-ability">
              Target one opposing player and <strong>force a mod swap</strong> for this pick:
            </div>
            <div className="mod-table">
              <div className="mod-row"><span className="mod-from">Hidden</span><span className="mod-arr">→</span><span className="mod-to">Flashlight</span></div>
              <div className="mod-row"><span className="mod-from">Hard Rock</span><span className="mod-arr">→</span><span className="mod-to">Easy</span></div>
              <div className="mod-row"><span className="mod-from">Double Time</span><span className="mod-arr">→</span><span className="mod-to">DT + Hard Rock</span></div>
              <div className="mod-row"><span className="mod-from">No Mod</span><span className="mod-arr">→</span><span className="mod-to">Hidden</span></div>
            </div>
            <div className="el-foot" style={{ marginTop: 12 }}><span className="el-tag">3-pick cooldown</span></div>
            <p className="el-wip">Full description still being finalised.</p>
          </div>
        </div>
      </section>

      {/* TARGETING */}
      <div className="target-section" id="targeting">
        <div className="target-inner">
          <div className="eyebrow">Targeting</div>
          <h2 className="section-title">After every pick, your team targets</h2>
          <p className="section-lead" style={{ maxWidth: 600, marginTop: 10 }}>
            After each map, every player on your team picks one opponent to target. The element
            match-up between you and your target either multiplies or reduces your score — then
            that difference hits their HP.
          </p>

          <div className="cycle-strip">
            <div className="cycle-node"><div className="cycle-node-dot c-witch">🧪</div><div className="cycle-node-label">Witch</div></div>
            <div className="cycle-arrow">▶</div>
            <div className="cycle-node"><div className="cycle-node-dot c-human">🎲</div><div className="cycle-node-label">Human</div></div>
            <div className="cycle-arrow">▶</div>
            <div className="cycle-node"><div className="cycle-node-dot c-demi">⚡</div><div className="cycle-node-label">Demigod</div></div>
            <div className="cycle-arrow">▶</div>
            <div className="cycle-node"><div className="cycle-node-dot c-soul">🔮</div><div className="cycle-node-label">Soulweaver</div></div>
            <div className="cycle-arrow">▶</div>
            <div className="cycle-node"><div className="cycle-node-dot c-witch">🧪</div><div className="cycle-node-label">Witch</div></div>
          </div>
          <p className="cycle-caption">▶ means &quot;is weak against&quot; — the element being pointed at has the advantage.</p>

          <div className="target-rules">
            <div className="target-rule">
              <div className="target-rule-icon">📉</div>
              <div>
                <div className="target-rule-label">You target someone strong against you</div>
                <div className="target-rule-desc">Your score is <strong style={{ color: "#f87171" }}>reduced by 15%</strong> before it counts as damage.</div>
              </div>
            </div>
            <div className="target-rule">
              <div className="target-rule-icon">📈</div>
              <div>
                <div className="target-rule-label">You target someone weak against you</div>
                <div className="target-rule-desc">Your score is <strong style={{ color: "#4ade80" }}>multiplied by 15%</strong> before it counts as damage.</div>
              </div>
            </div>
          </div>

          <div className="calc-box">
            <div className="calc-label">Example — 3 players from Team A all targeting Player D</div>
            <div className="calc-scores">
              <div className="calc-player"><span className="calc-player-name">Player A</span><span className="calc-player-score">301,841</span></div>
              <div className="calc-player"><span className="calc-player-name">Player D (target)</span><span className="calc-player-score">293,192</span></div>
              <div className="calc-player"><span className="calc-player-name">Player B</span><span className="calc-player-score">581,294</span></div>
              <div className="calc-player"><span className="calc-player-name"></span><span className="calc-player-score"></span></div>
              <div className="calc-player"><span className="calc-player-name">Player C</span><span className="calc-player-score">491,495</span></div>
            </div>
            <div className="calc-result-row">
              Differences vs D: 8,649 + 288,102 + 198,303 = 495,054<br />
              Average damage applied to D&apos;s HP: <strong>495,054 ÷ 3 = 165,018</strong>
            </div>
          </div>
        </div>
      </div>

      {/* SCHEDULE */}
      <section className="page-section" id="schedule">
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 60, alignItems: "start" }} className="sched-layout">
          <div>
            <div className="eyebrow">Schedule</div>
            <h2 className="section-title">What&apos;s happening when</h2>
            <p className="section-lead" style={{ marginTop: 10, maxWidth: "100%" }}>
              Dates are still being confirmed. November 2026 is the target for the LAN.
            </p>
          </div>
          <div className="schedule-wrap">
            <div className="sched-row">
              <span className="sched-date">Now</span>
              <span className="sched-name">Beta testing</span>
              <span className="badge badge-live">Open</span>
            </div>
            <div className="sched-row">
              <span className="sched-date">TBD</span>
              <span className="sched-name">Individual registration opens</span>
              <span className="badge badge-tbd">TBD</span>
            </div>
            <div className="sched-row">
              <span className="sched-date">TBD</span>
              <div>
                <div className="sched-name">Element roll — Twitch stream</div>
                <div className="sched-note">All players get their element assigned live on stream</div>
              </div>
              <span className="badge badge-tbd">TBD</span>
            </div>
            <div className="sched-row">
              <span className="sched-date">TBD · 1 week</span>
              <span className="sched-name">Team formation window</span>
              <span className="badge badge-tbd">TBD</span>
            </div>
            <div className="sched-row">
              <span className="sched-date">November 2026</span>
              <div>
                <div className="sched-name">Tournament — LAN</div>
                <div className="sched-note">In-person. Location and exact date still being confirmed.</div>
              </div>
              <span className="badge badge-later">Upcoming</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="page-section" id="faq" style={{ paddingTop: 0 }}>
        <div className="eyebrow">FAQ</div>
        <h2 className="section-title">Common questions</h2>
        <div className="faq-grid">
          <div className="faq-item"><div className="faq-q">Is there a rank limit?</div><div className="faq-a">Not announced yet. Details will come as the format is confirmed through beta testing.</div></div>
          <div className="faq-item"><div className="faq-q">Can I pick my element?</div><div className="faq-a">No. Every element is rolled live on Twitch after registrations close. <strong>Fully random</strong> — no trades, no requests.</div></div>
          <div className="faq-item"><div className="faq-q">Can I bring a pre-made team?</div><div className="faq-a">You register alone. Teams form <strong>after</strong> elements are assigned, during the 1-week window. The point is that your element shapes who you team with.</div></div>
          <div className="faq-item"><div className="faq-q">What if I want to play as a duo?</div><div className="faq-a">Teams of 2 are allowed. You&apos;ll have more HP per player but you&apos;re going against 3-player squads. Only do this if you and your partner are both confident.</div></div>
          <div className="faq-item"><div className="faq-q">Why is so much still TBD?</div><div className="faq-a">This is the first time this concept is being run. Beta testing exists so nothing is broken before dates get locked in.</div></div>
          <div className="faq-item"><div className="faq-q">Will it be streamed?</div><div className="faq-a">Yes — the element roll stream is on Twitch, and LAN matches will be streamed too. Links go up in Discord when ready.</div></div>
          <div className="faq-item"><div className="faq-q">Where&apos;s the LAN?</div><div className="faq-a">Location logistics are still being confirmed. All details will be announced in the Discord and on this page.</div></div>
          <div className="faq-item"><div className="faq-q">How do I help beta test?</div><div className="faq-a">Hit &quot;Sign up to test&quot; at the top of the page or jump in the Discord. We need players to run through matches so we can find issues before the real event.</div></div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div>
          <div className="footer-brand">Ascension Arena</div>
          <div className="footer-copy">Community osu! tournament.<br />Name not yet confirmed. LAN confirmed for November 2026.</div>
        </div>
        <div>
          <div className="footer-col-head">Pages</div>
          <ul className="footer-links">
            <li><a href="#">Home</a></li>
            <li><a href="#registration">Register</a></li>
            <li><a href="#elements">Elements &amp; Rules</a></li>
            <li><a href="/mappool">Mappool</a></li>
          <li><a href="#schedule">Schedule</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </div>
        <div>
          <div className="footer-col-head">Community</div>
          <ul className="footer-links">
            <li><a href="#">Discord</a></li>
            <li><a href="#">Twitch</a></li>
            <li><a href="#">YouTube</a></li>
            <li><a href="#">osu! Forum Thread</a></li>
          </ul>
        </div>
        <div className="footer-osu-note">
          <span>Ascension Arena is not affiliated with ppy Pty Ltd. osu! is a registered trademark of ppy Pty Ltd.</span>
          <span>Built by the community, for the community.</span>
        </div>
      </footer>
    </>
  );
}
