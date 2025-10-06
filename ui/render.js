import { $ } from "./dom.js";
import { groupByTheme } from "../systems/themeManager.js";
import { HEROES, CREATURES } from "../systems/constants.js";

// Build selects (with optgroups) and keep them non-empty
export function buildSelect(state){
  const heroSelect = $("#select-hero");
  const creatureSelect = $("#select-creature");
  heroSelect.innerHTML = ""; creatureSelect.innerHTML = "";

  const heroList = (state?.lists?.hero?.length ? state.lists.hero : HEROES);
  const creatureList = (state?.lists?.creature?.length ? state.lists.creature : CREATURES);

  // Correct grouping by proper side
  const heroGrouped = groupByTheme(heroList, "hero");
  const creatureGrouped = groupByTheme(creatureList, "creature");

  const fill = (sel, grouped) => {
    const themes = Object.keys(grouped);
    if (!themes.length) {
      (grouped.Misc || []).forEach(n=>{
        const opt = document.createElement("option");
        opt.textContent = n; opt.value = n;
        sel.append(opt);
      });
      return;
    }
    for (const [theme, names] of Object.entries(grouped)) {
      const optg = document.createElement("optgroup"); optg.label = theme;
      names.forEach(n => { const opt = document.createElement("option"); opt.textContent=n; opt.value = n; optg.append(opt); });
      sel.append(optg);
    }
  };

  fill(heroSelect, heroGrouped);
  fill(creatureSelect, creatureGrouped);
}

export function renderAll(state){
  // Rebuild selects each render (safe) — guarantees not empty
  buildSelect(state);

  // Basic stat refresh (safe defaults)
  const p = state.player;
  $("#stat-wave").textContent = String(state.wave ?? 1);
  $("#stat-theme").textContent = state.theme ?? "—";
  $("#stat-player").textContent = p?.name ?? "—";
  $("#stat-class").textContent = p?.className ?? "—";
  $("#stat-hp").textContent = `${Math.max(0, Math.ceil(p?.hp ?? 0))} / ${(p?.maxHP?.() ?? 100)}`;
  $("#stat-atk").textContent = Math.ceil(p?.atk?.() ?? 0);
  $("#stat-def").textContent = Math.ceil(p?.def?.() ?? 0);
  $("#stat-level").textContent = p?.level ?? 1;
  $("#stat-gold").textContent = Math.floor(p?.gold ?? 0);

  const need = p?.xpNeeded?.() ?? 1;
  const pct = need ? Math.min(99.5, (p?.xp ?? 0) / need * 100) : 100;
  document.getElementById("xp-fill").style.width = `${pct}%`;
}
