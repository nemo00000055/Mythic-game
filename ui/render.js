// ui/render.js
import { $, $$, el, clear } from './dom.js';
import { groupByTheme } from '../systems/themeManager.js';
import { THEME_ROTATION, HEROES, CREATURES } from '../systems/constants.js';

// --- local PRNG helper (deterministic enough for UI fill) ---
function prngPickN(arr, n) {
  const rand = () => Math.random();
  const set = new Set();
  while (set.size < Math.min(n, arr.length)) {
    set.add(arr[Math.floor(rand() * arr.length)]);
  }
  return Array.from(set);
}

function buildSelect(selectEl, side, list) {
  clear(selectEl);

  // Fallback: if grouping returns nothing, show flat list
  const grouped = groupByTheme(list, side);
  const themes = Object.keys(grouped || {});
  if (!themes.length) {
    list.forEach(name => {
      const opt = el('option', '', name);
      opt.value = name;
      selectEl.appendChild(opt);
    });
    return;
  }

  themes.forEach(theme => {
    const og = document.createElement('optgroup');
    og.label = theme;
    (grouped[theme] || []).forEach(name => {
      const opt = el('option', '', name);
      opt.value = name;
      og.appendChild(opt);
    });
    selectEl.appendChild(og);
  });
}

export function renderAll(state) {
  // Stats chips, xp, wave label, next boss
  $('#stat-wave').textContent = String(state.wave);
  $('#stat-theme').textContent = state.theme || THEME_ROTATION[0];
  const nextBossIn = 5 - ((state.wave - 1) % 5 || 5);
  $('#stat-nextboss').textContent = `${nextBossIn}`;

  const p = state.player;
  if (p) {
    $('#stat-player').textContent = p.name || 'Unnamed';
    $('#stat-class').textContent = p.className || '—';
    $('#stat-hp').textContent = `${Math.max(0, Math.ceil(p.hp))} / ${p.maxHP()}`;
    $('#stat-atk').textContent = `${Math.ceil(p.atk())}`;
    $('#stat-def').textContent = `${Math.ceil(p.def())}`;
    $('#stat-level').textContent = `${p.level}`;
    $('#stat-gold').textContent = `${Math.floor(p.gold)}`;
    const need = p.xpNeeded();
    const fill = need > 0 ? (p.xp / need) : 1;
    $('#xp-fill').style.width = `${Math.max(3, Math.min(100, fill * 100))}%`;
  }

  // --- Self-heal: ensure we always have 10 entries in each picklist ---
  if (!state.lists || !Array.isArray(state.lists.hero) || state.lists.hero.length === 0) {
    state.lists = state.lists || {};
    state.lists.hero = prngPickN(HEROES, 10);
  }
  if (!Array.isArray(state.lists.creature) || state.lists.creature.length === 0) {
    state.lists.creature = prngPickN(CREATURES, 10);
  }

  const selHero = $('#select-hero');
  const selCreature = $('#select-creature');

  // Normalize side to lowercase for robustness ("Hero"/"Creature" -> "hero"/"creature")
  const sideSel = $('#select-side');
  let sideVal = (sideSel?.value || '').toLowerCase();
  if (sideVal !== 'hero' && sideVal !== 'creature') {
    // default to hero if unknown
    sideVal = 'hero';
    if (sideSel) sideSel.value = 'Hero';
  }

  buildSelect(selHero, 'hero', state.lists.hero);
  buildSelect(selCreature, 'creature', state.lists.creature);

  // --- Bind mutual exclusivity only once ---
  if (!selHero.dataset.bound) {
    selHero.addEventListener('change', () => {
      if (selHero.value) {
        if (sideSel) sideSel.value = 'Hero';
        selCreature.selectedIndex = -1; // clear other
      }
      validateStart();
    });
    selHero.dataset.bound = '1';
  }

  if (!selCreature.dataset.bound) {
    selCreature.addEventListener('change', () => {
      if (selCreature.value) {
        if (sideSel) sideSel.value = 'Creature';
        selHero.selectedIndex = -1; // clear other
      }
      validateStart();
    });
    selCreature.dataset.bound = '1';
  }

  if (sideSel && !sideSel.dataset.bound) {
    sideSel.addEventListener('change', (e) => {
      const v = (e.target.value || '').toLowerCase();
      if (v === 'hero')      selCreature.selectedIndex = -1;
      else if (v === 'creature') selHero.selectedIndex = -1;
      validateStart();
    });
    sideSel.dataset.bound = '1';
  }

  validateStart();
}

function validateStart() {
  const name = $('#input-name')?.value?.trim();
  const side = ($('#select-side')?.value || '').toLowerCase();
  const classPick =
    side === 'hero' ? $('#select-hero')?.value :
    side === 'creature' ? $('#select-creature')?.value : '';

  $('#btn-start').disabled = !(name && classPick);
}
