// ui/render.js
import { $, el, clear } from './dom.js';
import { HEROES, CREATURES, THEME_ROTATION } from '../systems/constants.js';

// Build selects directly from state.lists; fallback to constants if empty.
// No theme grouping here (to eliminate the breakage source); flat but guaranteed visible.
function ensureLists(state) {
  if (!state.lists) state.lists = { hero: [], creature: [] };
  if (!Array.isArray(state.lists.hero) || state.lists.hero.length === 0) {
    state.lists.hero = HEROES.slice(0, 10);
  }
  if (!Array.isArray(state.lists.creature) || state.lists.creature.length === 0) {
    state.lists.creature = CREATURES.slice(0, 10);
  }
}

function fillSelect(selectEl, names) {
  clear(selectEl);
  for (const name of names) {
    const opt = el('option', '', name);
    opt.value = name;
    selectEl.appendChild(opt);
  }
}

export function renderAll(state) {
  // Ensure lists exist no matter what
  ensureLists(state);

  // Picklists (flat, robust)
  const selHero = $('#select-hero');
  const selCreature = $('#select-creature');
  if (selHero) fillSelect(selHero, state.lists.hero);
  if (selCreature) fillSelect(selCreature, state.lists.creature);

  // Stats and header info (safe defaults)
  const p = state.player;
  $('#stat-wave').textContent  = String(state.wave ?? 1);
  $('#stat-theme').textContent = state.theme ?? THEME_ROTATION[0];
  $('#stat-player').textContent = p?.name ?? '—';
  $('#stat-class').textContent  = p?.className ?? '—';
  $('#stat-hp').textContent     = `${Math.max(0, Math.ceil(p?.hp ?? 0))} / ${(p?.maxHP?.() ?? 100)}`;
  $('#stat-atk').textContent    = `${Math.ceil(p?.atk?.() ?? 0)}`;
  $('#stat-def').textContent    = `${Math.ceil(p?.def?.() ?? 0)}`;
  $('#stat-level').textContent  = `${p?.level ?? 1}`;
  $('#stat-gold').textContent   = `${Math.floor(p?.gold ?? 0)}`;

  const need = p?.xpNeeded?.() ?? 1;
  const fill = need ? Math.min(1, (p?.xp ?? 0) / need) : 1;
  const bar = document.getElementById('xp-fill');
  if (bar) bar.style.width = `${Math.max(3, Math.min(100, fill * 100))}%`;
}
