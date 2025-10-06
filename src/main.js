<script type="module">
import { $, openModal, closeModal, formatGold } from '../ui/dom.js';
import { renderAll } from '../ui/render.js';
import { setupEquipmentPanel, renderEquipment, setupInventoryPanel, renderInventory, setupShopPanel, renderShop } from '../ui/panels.js';
import { Shop } from '../systems/shop.js';
import { themeForWave } from '../systems/themeManager.js';
import { createLoot } from '../systems/loot.js';
import { seeded, uid } from '../systems/rng.js';
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
  inventory: { items: [], stash: [], buyback: [] }, // set by load or by item ops
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

function initLists() {
  // Pick 10 random unique from each as per spec
  const prng = seeded(Date.now());
  const pick10 = (arr) => {
    const set = new Set();
    while (set.size < 10) {
      set.add(arr[Math.floor(prng() * arr.length)]);
    }
    return Array.from(set);
  };
  state.lists.hero = pick10(HEROES);
  state.lists.creature = pick10(CREATURES);
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
    state.side = data.side;
    state.wave = data.wave;
    state.theme = data.theme;
    state.lists = data.lists;
    state.shop = Shop.deserialize(data.shop);
    state.inventory = data.inventory || state.inventory;
    state.player = Player.deserialize(data.player);
    return true;
  } catch {
    return false;
  }
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

// ---------- NEW: Game Over overlay ----------
function showGameOver() {
  // Prevent auto/inputs
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
      // Wipe run-time only; keep save if desired. Spec says "fall back to initial screen".
      window.location.href = 'index.html';
    });
  }
}

// ---------- Wave Resolution ----------
let autoTimer = null;

async function nextWave(mode = 'normal') {
  if (!state.player) return;

  // Compute difficulty + enemies, resolve combat (assumes existing helpers)
  const { isBoss, isElite, isSuper, enemies, diff } = await window.waveManager.roll(state);

  const res = await window.combat.resolve({
    player: state.player,
    mode,
    diff,
    enemies,
    isBoss, isElite, isSuper
  });

  // Apply results
  // Gold / XP
  state.player.gold += Math.floor(res.goldGained * (1 + state.player.goldPct()));
  const ding = state.player.addXP(res.xpGained);

  // Death handling
  if (state.player.hp <= 0) {
    // Log defeat and show Game Over, then fallback to index
    const log = $('#log');
    const li = document.createElement('li');
    li.textContent = `Defeated on wave ${state.wave}.`;
    log.prepend(li);
    renderAll(state);
    showGameOver(); // ---------- NEW
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

  // ---------- NEW: Auto restock every 20 waves ----------
  if (state.wave % 20 === 0) {
    state.shop.refresh(true);
  }

  // Rest / CD tick already handled inside combat or here
  // Re-render
  renderAll(state);
  save();

  // Continue auto
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

// Bind global buttons after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initLists();

  // Load if hash or explicit continue
  const doLoad = load();
  renderAll(state);

  // Buttons
  $('#btn-next').addEventListener('click', () => nextWave('normal'));
  $('#btn-special').addEventListener('click', () => nextWave('special'));
  $('#btn-auto').addEventListener('click', toggleAuto);
  $('#range-speed').addEventListener('input', (e) => {
    const v = Number(e.target.value); // assuming 0..100 mapped elsewhere
    state.auto.speedMs = 100 + (1000 - 100) * (100 - v) / 100;
  });

  // Panels setup (once)
  setupEquipmentPanel(state);
  setupInventoryPanel(state);
  setupShopPanel(state);

  // Top bar modals
  $('#btn-equipment').addEventListener('click', () => {
    openModal('dlg-equipment');
    renderEquipment(state);
  });
  $('#btn-inventory').addEventListener('click', () => {
    openModal('dlg-inventory');
    renderInventory(state);
  });
  $('#btn-shop').addEventListener('click', () => {
    openModal('dlg-shop');
    renderShop(state);
  });

  // Save / Load
  $('#btn-save').addEventListener('click', save);
  $('#btn-load').addEventListener('click', () => {
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

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal[open]').forEach(m => m.removeAttribute('open'));
    }
  });
});
</script>
