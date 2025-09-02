// ui/render.js
import { $, el, clear } from "./dom.js";
import { groupByTheme } from "../systems/themeManager.js";
import { HEROES, CREATURES } from "../systems/constants.js";

export function buildSelect(state){
  const side = $("#select-side").value;
  const heroSelect = $("#select-hero");
  const creatureSelect = $("#select-creature");
  clear(heroSelect); clear(creatureSelect);

  const heroList = (state?.lists?.hero?.length ? state.lists.hero : HEROES).slice(0, 999);
  const creatureList = (state?.lists?.creature?.length ? state.lists.creature : CREATURES).slice(0, 999);

  const heroGrouped = groupByTheme(heroList, "creature");
  const creatureGrouped = groupByTheme(creatureList, "hero");

  for(const [theme,names] of Object.entries(heroGrouped)){
    const optg = el("optgroup"); optg.label = theme;
    names.forEach(n => {
      const opt = el("option",null,n);
      opt.value = n;
      optg.append(opt);
    });
    heroSelect.append(optg);
  }
  for(const [theme,names] of Object.entries(creatureGrouped)){
    const optg = el("optgroup"); optg.label = theme;
    names.forEach(n => {
      const opt = el("option",null,n);
      opt.value = n;
      optg.append(opt);
    });
    creatureSelect.append(optg);
  }

  if(!heroSelect.children.length){
    HEROES.forEach(n=>heroSelect.append(new Option(n,n)));
  }
  if(!creatureSelect.children.length){
    CREATURES.forEach(n=>creatureSelect.append(new Option(n,n)));
  }

  heroSelect.disabled = (side!=="hero");
  creatureSelect.disabled = (side!=="creature");
  if(side==="hero") creatureSelect.selectedIndex = -1;
  if(side==="creature") heroSelect.selectedIndex = -1;
}

export function renderAll(state){
  $("#stat-player").textContent = state.player?.name || "—";
  $("#stat-class").textContent  = state.player?.className || "—";
  $("#stat-gold").textContent   = (state.player?.gold|0).toLocaleString();
  $("#stat-level").textContent  = state.player?.level ?? 1;
  $("#stat-wave").textContent   = state.wave;
  $("#stat-theme").textContent  = state.theme || "—";
  $("#stat-nextboss").textContent = nextBossIn(state.wave);

  const hp = state.player?.hp ?? 0;
  const max = state.player?.maxHP() ?? 100;
  $("#stat-hp").textContent = `${hp}/${max}`;
  $("#stat-atk").textContent = state.player?.atk() ?? 0;
  $("#stat-def").textContent = state.player?.def() ?? 0;

  const need = state.player?.xpNeeded() ?? 1;
  const pct = need ? Math.min(99.5, (state.player?.xp ?? 0) / need * 100) : 100;
  $("#xp-fill").style.width = `${pct}%`;

  $("#btn-next").disabled = !state.started;
  const ready = state.player?.specialReady?.() ?? false;
  $("#btn-special").disabled = !state.started || !ready;

  $("#nextwave").textContent = state.nextPreviewText || "—";
}

function nextBossIn(wave){
  const mod = wave % 5;
  return mod===0 ? 0 : (5 - mod);
}
