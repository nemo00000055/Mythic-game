// src/main.js (ES module — no <script> tag here)
import { $, openModal, closeModal, formatGold } from '../ui/dom.js';
import { renderAll } from '../ui/render.js';
import {
  setupEquipmentPanel, renderEquipment,
  setupInventoryPanel, renderInventory,
  setupShopPanel, renderShop
} from '../ui/panels.js';
import { Shop } from '../systems/shop.js';
import { themeForWave } from '../systems/themeManager.js';
import { createLoot } from '../systems/loot.js';
import { seeded } from '../systems/rng.js';
import { Player } from '../models/player.js';
import { HEROES, CREATURES, THEME_ROTATION } from '../systems/constants.js';

const SAVE_KEY = 'mythic-arena-save';

const state = {
  side: null,                    // "hero" | "creature"
  wave: 1,
  theme: THEME_ROTATION[0],
  auto: { running: false, speedMs: 800 },
  player: null,                  // Player instance
  lists: { hero: [], creature: [] },
  shop: new Shop(),
  inventory: { items: [], stash: [], buyback: [] },
  ui: {
    // inventory panel UI state
    invFilterRarity: 'all',
    invFilterSlot: 'all',
    invSortKey: 'rarity',      // rarity|slot|price
    invSortDir: 'desc',        // asc|desc
    // shop panel UI state
    shopFilterRarity: 'all',
    shopFilterSlot: 'all',
    shopSortKey: 'rarity',
    shopSortDir: 'desc',
  }
};

window.state = state; // for debugging

// --- helpers ---
function prngPickN(arr, n) {
  const prng = seeded(Date.now());
  const set = new Set();
  while (set.size < Math.min(n, arr.length)) {
    set.add(arr[Math.floor(prng() * arr.length)]);
  }
  return Array.from(set);
}

function initLists() {
  state.lists.hero = prngPickN(HEROES, 10);
  state.lists.creature = prngPickN(CREATURES, 10);
}

function ensureLists() {
  if (!state.lists || !Array.isArray(state.lists.hero) || state.lists.hero.length === 0) {
    state.lists = state.lists || {};
    state.lists.hero = prngPickN(HEROES, 10);
  }
  if (!state.lists || !Array.isArray(state.lists.creature) || state.lists.creature.length === 0) {
    state.lists = state.lists || {};
    state.lists.creature = prngPickN(CREATURES, 10);
  }
}

function save() {
  const blob = {
    side: state.side,
    wave: state.wave,
    theme: state.theme,
    player: state.player?.serialize ? state.player.serialize() : null,
    inventory: state.inventory,
    shop: state.shop.serialize(),
    lists: state.lists
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
}

function load() {
  const s = localStorage.getItem(SAVE_KEY);
  if (!s) return false;
  try {
    const data = JSON.parse(s);
    state.side = data.side ?? null;
    state.wave = data.wave ?? 1;
    state.theme = data.theme ?? THEME_ROTATION[0];
    state.shop = Shop.deserialize(data.shop ?? {});
    state.inventory = data.inventory || state.inventory;
    state.player = data.player ? Player.deserialize(data.player) : null;
    state.lists = data.lists || { hero: [], creature: [] };
    ensureLists(); // <- make sure selects are never empty
    return true;
  } catch {
    return false;
  }
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

// ---------- Game Over overlay ----------
function showGameOver() {
  state.auto.running = false;

  let overlay = document.getElementById('gameover-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'gameover-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';
    overlay.innerHTML = `
      <div style="background:#141414;border:1px solid #2a2a2a;border-radius:14px;padding:28px;max-width:480px;text-align:center;">
        <h2 style="margin:0 0 12px;font-size:28px;">Game Over</h2>
        <p style="opacity:.85;margin:0 0 20px;">Your character has fallen on wave ${state.wave}. Try a new run!</p>
        <button id="btn-return-title" class="btn primary">Return to Title</button>
      </div>`;
    document.body.appendChild(overlay);
    $('#btn-return-title').addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
}

// ---------- Wave Resolution ----------
let autoTimer = null;

async function nextWave(mode = 'normal') {
  if (!state.player) return;

  // roll & resolve (provided by existing global systems)
  const { isBoss, isElite, isSuper, enemies, diff } = await window.waveManager.roll(state);

  const res = await window.combat.resolve({
    player: state.player,
    mode,
    diff,
    enemies,
    isBoss, isElite, isSuper
  });

  // Gold / XP
  state.player.gold += Math.floor(res.goldGained * (1 + state.player.goldPct()));
  const ding = state.player.addXP(res.xpGained);

  // Death handling
  if (state.player.hp <= 0) {
    const log = $('#log');
    const li = document.createElement('li');
    li.textContent = `Defeated on wave ${state.wave}.`;
    log.prepend(li);
    renderAll(state);
    showGameOver();
    return;
  }

  // Loot
  if (res.kills > 0) {
    const loot = createLoot({ isBoss, isElite, isSuper });
    state.inventory.items.push(...loot);
  }

  // Next wave
  state.wave += 1;
  state.theme = themeForWave(state.wave);

  // Auto restock every 20 waves
  if (state.wave % 20 === 0) {
    state.shop.refresh(true);
  }

  renderAll(state);
  save();

  if (state.auto.running) {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => nextWave('auto'), state.auto.speedMs);
  }
}

function toggleAuto() {
  state.auto.running = !state.auto.running;
  if (state.auto.running) {
    nextWave('auto');
  } else {
    clearTimeout(autoTimer);
  }
}

// ---------- Start Run ----------
function startRun() {
  const name = $('#input-name')?.value?.trim();
  const side = $('#select-side')?.value;
  const classPick =
    side === 'hero' ? $('#select-hero')?.value :
    side === 'creature' ? $('#select-creature')?.value : '';

  if (!name || !classPick) return;

  state.side = side;
  state.player = new Player(name, classPick);
  state.wave = 1;
  state.theme = THEME_ROTATION[0];

  renderAll(state);
  save();
}

// ---------- DOM Ready ----------
document.addEventListener('DOMContentLoaded', () => {
  const hash = (window.location.hash || '').replace('#', '');

  if (hash === 'new') {
    clearSave();
    initLists();
  } else if (hash === 'load') {
    if (!load()) {
      initLists();
    }
  } else {
    // default: try load, otherwise new lists
    if (!load()) {
      initLists();
    }
  }
  ensureLists(); // belt & suspenders

  renderAll(state);

  // Buttons
  $('#btn-start')?.addEventListener('click', startRun);
  $('#btn-next')?.addEventListener('click', () => nextWave('normal'));
  $('#btn-special')?.addEventListener('click', () => nextWave('special'));
  $('#btn-auto')?.addEventListener('click', toggleAuto);
  $('#range-speed')?.addEventListener('input', (e) => {
    const v = Number(e.target.value); // 0..100 slider mapped to 100..1000 ms
    state.auto.speedMs = 100 + (1000 - 100) * (100 - v) / 100;
  });

  // Panels setup (once)
  setupEquipmentPanel(state);
  setupInventoryPanel(state);
  setupShopPanel(state);

  // Top bar modals
  $('#btn-equipment')?.addEventListener('click', () => {
    openModal('dlg-equipment');
    renderEquipment(state);
  });
  $('#btn-inventory')?.addEventListener('click', () => {
    openModal('dlg-inventory');
    renderInventory(state);
  });
  $('#btn-shop')?.addEventListener('click', () => {
    openModal('dlg-shop');
    renderShop(state);
  });

  // Save / Load
  $('#btn-save')?.addEventListener('click', save);
  $('#btn-load')?.addEventListener('click', () => {
    const ok = load();
    renderAll(state);
  });

  // Modal close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-close');
      closeModal(id);
    });
  });

  // ESC to close any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal[open]').forEach(m => m.removeAttribute('open'));
    }
  });
});
