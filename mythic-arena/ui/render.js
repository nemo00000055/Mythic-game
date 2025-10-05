import { $, $$, clear, el } from "./dom.js";
import { HEROES, CREATURES, groupHeroesByTheme, groupCreaturesByTheme } from "../systems/constants.js";
// These two functions should already exist deeper in your game; we call them after entering Battle.
import { bootBattleIfNeeded, renderAll } from "../ui/panels.js";
import { previewWaveText } from "../systems/themeManager.js";

/**
 * Build selection lists (10 random entries each) and group by theme with <optgroup>.
 * If grouping fails, fallback to flat list (robustness).
 */
export function buildSelectionLists(state) {
  const side = $("#select-side").value;
  const heroSel = $("#select-hero");
  const creatureSel = $("#select-creature");
  clear(heroSel);
  clear(creatureSel);

  // Pick 10 random unique heroes/creatures
  const pick10 = (arr) => {
    const pool = arr.slice();
    const out = [];
    while (out.length < 10 && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    return out.sort();
  };

  const h10 = pick10(HEROES);
  const c10 = pick10(CREATURES);

  // Build <optgroup> by theme; fallback to flat
  const buildGrouped = (select, groups) => {
    try {
      const themes = Object.keys(groups);
      for (const theme of themes) {
        const names = groups[theme].filter(n => (select === heroSel ? h10 : c10).includes(n));
        if (!names.length) continue;
        const og = el("optgroup");
        og.label = theme;
        for (const name of names) {
          const opt = el("option");
          opt.value = name;
          opt.textContent = name;
          og.appendChild(opt);
        }
        select.appendChild(og);
      }
      // If nothing got grouped (e.g., all filtered out), flat fallback:
      if (!select.children.length) {
        for (const name of (select === heroSel ? h10 : c10)) {
          const opt = el("option", null, name);
          opt.value = name;
          select.appendChild(opt);
        }
      }
    } catch {
      for (const name of (select === heroSel ? h10 : c10)) {
        const opt = el("option", null, name);
        opt.value = name;
        select.appendChild(opt);
      }
    }
  };

  buildGrouped(heroSel, groupHeroesByTheme());
  buildGrouped(creatureSel, groupCreaturesByTheme());

  // Clear the opposite list when side chosen (handled by main.js), but pre-select first available
  if (side === "hero") {
    creatureSel.selectedIndex = -1;
    if (heroSel.options.length) heroSel.selectedIndex = 0;
  } else if (side === "creature") {
    heroSel.selectedIndex = -1;
    if (creatureSel.options.length) creatureSel.selectedIndex = 0;
  } else {
    heroSel.selectedIndex = -1;
    creatureSel.selectedIndex = -1;
  }
}

/**
 * Entering battle: create player & game state (if needed), then render HUD.
 * Accepts initialName, initialSide, initialClassName.
 */
export function renderBattleHUD({ initialName, initialSide, initialClassName }) {
  bootBattleIfNeeded({ name: initialName, side: initialSide, className: initialClassName });
  renderAll(); // paints stats, binds buttons, etc.
}

/** Paint the Next Wave preview label using the canonical preview function. */
export function updateNextWavePreview() {
  const txt = previewWaveText(); // assumes it reads from global/current state
  $("#nextwave").textContent = txt || "—";
}
