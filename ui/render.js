// ui/render.js
import { $, $$, el, clear } from './dom.js';
import { groupByTheme, nameTheme } from '../systems/themeManager.js';
import { THEME_ROTATION } from '../systems/constants.js';

function buildSelect(selectEl, side, list, currentTheme) {
  clear(selectEl);

  // Group into <optgroup>s by theme with fallback to flat list
  const grouped = groupByTheme(list, side);
  const themes = Object.keys(grouped);
  if (themes.length === 0) {
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
    grouped[theme].forEach(name => {
      const opt = el('option', '', name);
      opt.value = name;
      og.appendChild(opt);
    });
    selectEl.appendChild(og);
  });
}

export function renderAll(state) {
  // Stats chips, xp, wave label, preview, buttons enablement
  $('#stat-wave').textContent = String(state.wave);
  $('#stat-theme').textContent = state.theme;
  const nextBossIn = 5 - ((state.wave - 1) % 5 || 5);
  $('#stat-nextboss').textContent = `${nextBossIn}`;

  const p = state.player;
  if (p) {
    $('#stat-player').textContent = p.name || 'Unnamed';
    $('#stat-class').textContent = p.className;
    $('#stat-hp').textContent = `${Math.max(0, Math.ceil(p.hp))} / ${p.maxHP()}`;
    $('#stat-atk').textContent = `${Math.ceil(p.atk())}`;
    $('#stat-def').textContent = `${Math.ceil(p.def())}`;
    $('#stat-level').textContent = `${p.level}`;
    $('#stat-gold').textContent = `${Math.floor(p.gold)}`;
    // XP bar
    const need = p.xpNeeded();
    const fill = need > 0 ? (p.xp / need) : 1;
    $('#xp-fill').style.width = `${Math.max(3, Math.min(100, fill * 100))}%`;
  }

  // Build selects with mutual exclusivity & side sync
  const selHero = $('#select-hero');
  const selCreature = $('#select-creature');
  buildSelect(selHero, 'hero', state.lists.hero, state.theme);
  buildSelect(selCreature, 'creature', state.lists.creature, state.theme);

  // ---------- NEW: Mutual exclusivity wiring ----------
  // Choose hero: set side=hero, clear creature select value
  selHero.addEventListener('change', () => {
    if (selHero.value) {
      $('#select-side').value = 'hero';
      selCreature.selectedIndex = -1; // clear the other
    }
    validateStart(state);
  });

  // Choose creature: set side=creature, clear hero select value
  selCreature.addEventListener('change', () => {
    if (selCreature.value) {
      $('#select-side').value = 'creature';
      selHero.selectedIndex = -1;
    }
    validateStart(state);
  });

  // Side select keeps only one list active
  $('#select-side').addEventListener('change', (e) => {
    const v = e.target.value;
    if (v === 'hero') {
      selCreature.selectedIndex = -1;
    } else if (v === 'creature') {
      selHero.selectedIndex = -1;
    }
    validateStart(state);
  });

  // Start button enabled only if a name and one class selected
  validateStart(state);
}

function validateStart(state) {
  const name = $('#input-name')?.value?.trim();
  const side = $('#select-side')?.value;
  const classPick =
    side === 'hero' ? $('#select-hero')?.value :
    side === 'creature' ? $('#select-creature')?.value : '';

  const ok = !!name && !!classPick;
  $('#btn-start').disabled = !ok;
}
