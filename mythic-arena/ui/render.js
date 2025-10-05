import { $ } from "./dom.js";

/**
 * Called only after Start (or after a Load that fully restores a running game).
 * You already have the rest of your game setup; this function only paints HUD safely.
 */
export function renderBattleHUD({ initialName, initialSide, initialClassName }) {
  const st = window.state || {};
  st.player = st.player || {
    // minimal fallback so HUD doesn't explode if your boot code hasn’t run yet
    name: initialName || "—",
    className: initialClassName || "—",
    level: 1,
    hp: 100,
    maxHP: () => 100,
    atk: 0,
    def: 0
  };

  // If you have a real boot/ensure function, call it here before painting:
  if (typeof window.bootBattleIfNeeded === "function") {
    window.bootBattleIfNeeded({ name: initialName, side: initialSide, className: initialClassName });
  }

  renderAllSafely();
}

/** Safe, no-throw HUD paint */
export function renderAllSafely() {
  const st = window.state || {};
  const p = st.player || {};

  // Support both method and number-property shapes
  const val = (v, fallback=0) =>
    (typeof v === "function" ? v() : (v ?? fallback));

  const name = p.name ?? "—";
  const cls = p.className ?? "—";
  const lvl = p.level ?? 1;
  const hp  = p.hp ?? 0;
  const mx  = val(p.maxHP, 100);
  const atk = val(p.atk, 0);
  const def = val(p.def, 0);

  $("#stat-player").textContent = `Player: ${name}`;
  $("#stat-class").textContent  = `Class: ${cls}`;
  $("#stat-level").textContent  = `LV ${lvl}`;
  $("#stat-hp").textContent     = `HP ${hp}/${mx}`;
  $("#stat-atk").textContent    = `ATK ${atk}`;
  $("#stat-def").textContent    = `DEF ${def}`;

  // Leave wave/theme/nextboss to your existing code if present
  // XP fill (0–1 assumed)
  const xpFill = document.getElementById("xp-fill");
  if (xpFill) xpFill.style.width = `${Math.floor((st.player?.xpPct ?? 0)*100)}%`;
}

/** Next wave preview – keep a single point of truth. */
export function updateNextWavePreview() {
  if (typeof window.previewWaveText === "function") {
    const txt = window.previewWaveText();
    document.getElementById("nextwave").textContent = txt || "—";
  } else {
    document.getElementById("nextwave").textContent = "—";
  }
}
