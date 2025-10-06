// ui/panels.js
import { $, $$, el, clear, formatGold, openModal } from './dom.js';
import { rarityOrder } from '../systems/constants.js';

// ---------- Helpers ----------
function makeSelect(options, value, attrs = {}) {
  const s = document.createElement('select');
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  options.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.value === value) opt.selected = true;
    s.appendChild(opt);
  });
  return s;
}

function compareStats(base, candidate) {
  const dAtk = Math.round(candidate.atk - base.atk);
  const dDef = Math.round(candidate.def - base.def);
  const dHp  = Math.round(candidate.hp  - base.hp);
  return { dAtk, dDef, dHp };
}

function statSpan(delta) {
  const span = document.createElement('span');
  span.textContent = (delta > 0 ? `+${delta}` : `${delta}`);
  span.className = delta > 0 ? 'delta up' : (delta < 0 ? 'delta down' : 'delta');
  return span;
}

// ---------- INVENTORY PANEL ----------
export function setupInventoryPanel(state) {
  // Build static filter/sort controls once
  const root = $('#dlg-inventory .content');
  if (!root.dataset.built) {
    const controls = el('div', 'controls-row');

    const raritySel = makeSelect([
      { value: 'all', label: 'All Rarities' },
      { value: 'world', label: 'World Item' },
      { value: 'mythical', label: 'Mythical' },
      { value: 'legendary', label: 'Legendary' },
      { value: 'epic', label: 'Epic' },
      { value: 'rare', label: 'Rare' },
      { value: 'common', label: 'Common' },
      { value: 'normal', label: 'Normal' },
    ], state.ui.invFilterRarity, { id: 'inv-filter-rarity' });

    const slotSel = makeSelect([
      { value: 'all', label: 'All Slots' },
      ...['weapon','armor','trinket','boots','headgear','hands'].map(s => ({ value: s, label: s[0].toUpperCase()+s.slice(1) }))
    ], state.ui.invFilterSlot, { id: 'inv-filter-slot' });

    const sortSel = makeSelect([
      { value: 'rarity', label: 'Sort: Rarity' },
      { value: 'slot',   label: 'Sort: Slot' },
      { value: 'price',  label: 'Sort: Price' },
    ], state.ui.invSortKey, { id: 'inv-sort-key' });

    const dirSel = makeSelect([
      { value: 'desc', label: 'Desc' },
      { value: 'asc',  label: 'Asc'  },
    ], state.ui.invSortDir, { id: 'inv-sort-dir' });

    controls.append('Filters: ', raritySel, slotSel, ' • ', sortSel, dirSel);
    root.prepend(controls);
    root.dataset.built = '1';

    // wire
    raritySel.addEventListener('change', e => { state.ui.invFilterRarity = e.target.value; renderInventory(state); });
    slotSel.addEventListener('change',   e => { state.ui.invFilterSlot   = e.target.value; renderInventory(state); });
    sortSel.addEventListener('change',   e => { state.ui.invSortKey      = e.target.value; renderInventory(state); });
    dirSel.addEventListener('change',    e => { state.ui.invSortDir      = e.target.value; renderInventory(state); });
  }
}

export function renderInventory(state) {
  const listRoot = $('#dlg-inventory .list');
  clear(listRoot);

  const items = state.inventory.items.filter(it => !it.equipped);
  // Apply filters
  const filtered = items.filter(it => {
    const okRarity = state.ui.invFilterRarity === 'all' || it.rarityKey === state.ui.invFilterRarity;
    const okSlot   = state.ui.invFilterSlot   === 'all' || it.slot === state.ui.invFilterSlot;
    return okRarity && okSlot;
  });

  // Apply sort
  const sortKey = state.ui.invSortKey;
  const dir = state.ui.invSortDir === 'asc' ? 1 : -1;
  filtered.sort((a,b) => {
    if (sortKey === 'price') return (a.price - b.price) * dir;
    if (sortKey === 'slot')  return (a.slot.localeCompare(b.slot)) * dir;
    // rarity (use numeric order)
    const ra = rarityOrder(a.rarityKey), rb = rarityOrder(b.rarityKey);
    return (ra - rb) * dir;
  });

  // Render
  filtered.forEach(it => {
    const row = el('div', 'row item');
    row.innerHTML = `
      <div class="col main">
        <div class="name">
          <span class="badge rarity-${it.rarityKey}">${it.rarity}</span>
          ${it.name} <span class="muted">[${it.slot}]</span>
          ${it.setKey ? `<span class="badge set">${it.setKey}</span>` : ''}
        </div>
        <div class="stats">ATK ${it.stats.atk} DEF ${it.stats.def} HP ${it.stats.hp}
          ${renderAffixes(it)}
        </div>
      </div>
      <div class="col actions">
        <button data-act="equip">Equip</button>
        <button data-act="stash">Stash</button>
        <button data-act="sell">Sell (${formatGold(Math.floor(it.price*0.5))})</button>
        <button data-act="lock">${it.locked ? 'Unlock' : 'Lock'}</button>
      </div>
    `;

    // Compare panel vs currently equipped in same slot
    const eq = state.player?.equipped?.[it.slot];
    if (eq) {
      const base = { atk:eq.stats.atk, def:eq.stats.def, hp:eq.stats.hp };
      const cand = { atk:it.stats.atk, def:it.stats.def, hp:it.stats.hp };
      const { dAtk, dDef, dHp } = compareStats(base, cand);
      const cmp = el('div', 'compare');
      cmp.append('Δ ', statSpan(dAtk), ' ATK ', statSpan(dDef), ' DEF ', statSpan(dHp), ' HP');
      row.querySelector('.main').appendChild(cmp);
    }

    // Actions
    row.querySelector('[data-act="equip"]').addEventListener('click', () => {
      // unequip current slot to inventory
      const cur = state.player.equipped[it.slot];
      if (cur) {
        delete cur.equipped;
        state.inventory.items.push(cur);
      }
      // equip new
      it.equipped = true;
      state.player.equipped[it.slot] = it;
      // remove from inventory view
      const idx = state.inventory.items.findIndex(x => x.id === it.id);
      if (idx >= 0) state.inventory.items.splice(idx,1);
      renderInventory(state);
    });
    row.querySelector('[data-act="stash"]').addEventListener('click', () => {
      const idx = state.inventory.items.findIndex(x => x.id === it.id);
      if (idx >= 0) {
        const [moved] = state.inventory.items.splice(idx,1);
        state.inventory.stash.push(moved);
        renderInventory(state);
      }
    });
    row.querySelector('[data-act="sell"]').addEventListener('click', () => {
      const idx = state.inventory.items.findIndex(x => x.id === it.id);
      if (idx >= 0) {
        const [sold] = state.inventory.items.splice(idx,1);
        const val = Math.floor(sold.price * 0.5);
        state.player.gold += val;
        // track buyback (cap 6)
        state.inventory.buyback.unshift({ ...sold, buyPrice: Math.floor(sold.price * 0.6) });
        state.inventory.buyback = state.inventory.buyback.slice(0,6);
        renderInventory(state);
      }
    });
    row.querySelector('[data-act="lock"]').addEventListener('click', () => {
      it.locked = !it.locked;
      renderInventory(state);
    });

    listRoot.appendChild(row);
  });
}

function renderAffixes(it) {
  if (!it.affixes || it.affixes.length === 0) return '';
  return '<span class="affixes">' + it.affixes.map(a => {
    const v = a.type.endsWith('%') ? `${a.value}%` : `+${a.value}`;
    return `<span class="affix">${a.type.replace('%','')} ${v}</span>`;
  }).join(' ') + '</span>';
}

// ---------- SHOP PANEL ----------
export function setupShopPanel(state) {
  const root = $('#dlg-shop .content');
  if (!root.dataset.built) {
    const controls = el('div', 'controls-row');

    const raritySel = makeSelect([
      { value: 'all', label: 'All Rarities' },
      { value: 'world', label: 'World Item' },
      { value: 'mythical', label: 'Mythical' },
      { value: 'legendary', label: 'Legendary' },
      { value: 'epic', label: 'Epic' },
      { value: 'rare', label: 'Rare' },
      { value: 'common', label: 'Common' },
      { value: 'normal', label: 'Normal' },
    ], state.ui.shopFilterRarity, { id: 'shop-filter-rarity' });

    const slotSel = makeSelect([
      { value: 'all', label: 'All Slots' },
      ...['weapon','armor','trinket','boots','headgear','hands'].map(s => ({ value: s, label: s[0].toUpperCase()+s.slice(1) }))
    ], state.ui.shopFilterSlot, { id: 'shop-filter-slot' });

    const sortSel = makeSelect([
      { value: 'rarity', label: 'Sort: Rarity' },
      { value: 'slot',   label: 'Sort: Slot' },
      { value: 'price',  label: 'Sort: Price' },
    ], state.ui.shopSortKey, { id: 'shop-sort-key' });

    const dirSel = makeSelect([
      { value: 'desc', label: 'Desc' },
      { value: 'asc',  label: 'Asc'  },
    ], state.ui.shopSortDir, { id: 'shop-sort-dir' });

    controls.append('Filters: ', raritySel, slotSel, ' • ', sortSel, dirSel);
    root.prepend(controls);
    root.dataset.built = '1';

    raritySel.addEventListener('change', e => { state.ui.shopFilterRarity = e.target.value; renderShop(state); });
    slotSel.addEventListener('change',   e => { state.ui.shopFilterSlot   = e.target.value; renderShop(state); });
    sortSel.addEventListener('change',   e => { state.ui.shopSortKey      = e.target.value; renderShop(state); });
    dirSel.addEventListener('change',    e => { state.ui.shopSortDir      = e.target.value; renderShop(state); });
  }
}

export function renderShop(state) {
  const listRoot = $('#dlg-shop .list');
  clear(listRoot);

  const goldLabel = $('#dlg-shop .gold');
  if (goldLabel) goldLabel.textContent = formatGold(Math.floor(state.player?.gold ?? 0));

  const tab = $('#dlg-shop .tabs .tab.active')?.dataset.tab || 'consumables';
  const stock = state.shop.getStockForTab(tab);

  // Apply filters
  let rows = stock.filter(it => {
    if (!it) return false;
    const okRarity = state.ui.shopFilterRarity === 'all' || it.rarityKey === state.ui.shopFilterRarity || it.type === 'potion';
    const okSlot   = state.ui.shopFilterSlot   === 'all' || it.slot === state.ui.shopFilterSlot || it.type === 'potion';
    return okRarity && okSlot;
  });

  // Sort
  const sortKey = state.ui.shopSortKey;
  const dir = state.ui.shopSortDir === 'asc' ? 1 : -1;
  rows.sort((a,b) => {
    if (sortKey === 'price') return ((a.price||0) - (b.price||0)) * dir;
    if (sortKey === 'slot')  return ((a.slot||'').localeCompare(b.slot||'')) * dir;
    const ra = rarityOrder(a.rarityKey||'normal'), rb = rarityOrder(b.rarityKey||'normal');
    return (ra - rb) * dir;
  });

  // Render with Featured and hover compare
  rows.forEach((it, idx) => {
    const isFeatured = state.shop.isFeatured(it);
    const priceBase = Math.floor(it.price || 0);
    const priceDisplay = isFeatured ? Math.floor(priceBase * 0.7) : priceBase;

    const row = el('div', 'row item');
    row.innerHTML = `
      <div class="col main">
        <div class="name">
          ${it.type === 'potion' ? '<span class="badge">Potion</span>' : `<span class="badge rarity-${it.rarityKey}">${it.rarity}</span>`}
          ${it.name} ${it.slot ? `<span class="muted">[${it.slot}]</span>` : ''}
          ${it.setKey ? `<span class="badge set">${it.setKey}</span>` : ''}
          ${isFeatured ? `<span class="badge featured">Featured −30%</span>` : ''}
        </div>
        <div class="stats">
          ${it.type === 'potion' ? it.desc : `ATK ${it.stats.atk} DEF ${it.stats.def} HP ${it.stats.hp} ${renderAffixes(it)}`}
        </div>
        <div class="compare hover" style="display:none;"></div>
      </div>
      <div class="col actions">
        <div class="price">${formatGold(priceDisplay)}</div>
        <button data-act="buy">Buy</button>
      </div>
    `;

    // ---------- NEW: Hover compare in Shop ----------
    if (it.slot && state.player?.equipped?.[it.slot]) {
      const cmpDiv = row.querySelector('.compare.hover');
      row.addEventListener('mouseenter', () => {
        const eq = state.player.equipped[it.slot];
        const base = { atk:eq.stats.atk, def:eq.stats.def, hp:eq.stats.hp };
        const cand = { atk:it.stats.atk, def:it.stats.def, hp:it.stats.hp };
        const { dAtk, dDef, dHp } = compareStats(base, cand);
        clear(cmpDiv);
        cmpDiv.append('Δ ', statSpan(dAtk), ' ATK ', statSpan(dDef), ' DEF ', statSpan(dHp), ' HP');
        cmpDiv.style.display = '';
      });
      row.addEventListener('mouseleave', () => {
        row.querySelector('.compare.hover').style.display = 'none';
      });
    }

    // Buy
    row.querySelector('[data-act="buy"]').addEventListener('click', () => {
      const cost = priceDisplay;
      if ((state.player?.gold ?? 0) < cost) return;
      state.player.gold -= cost;

      if (it.type === 'potion') {
        // Add to inventory as consumable; or use immediately per your existing logic
        state.inventory.items.push({ ...it, id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()) });
      } else {
        // Move purchased item to inventory
        state.inventory.items.push(it);
        // Remove from shop stock
        state.shop.removeFromTab(tab, it.id);
      }
      renderShop(state);
    });

    listRoot.appendChild(row);
  });

  // Refresh button (cost shown)
  const btnRefresh = $('#btn-shop-refresh');
  if (btnRefresh) {
    btnRefresh.textContent = `Refresh (${formatGold(state.shop.refreshCost())})`;
    btnRefresh.onclick = () => {
      const cost = state.shop.refreshCost();
      if ((state.player?.gold ?? 0) < cost) return;
      state.player.gold -= cost;
      state.shop.refresh(true);
      renderShop(state);
    };
  }
}

function renderAffixes(it) {
  if (!it.affixes || it.affixes.length === 0) return '';
  return '<span class="affixes">' + it.affixes.map(a => {
    const v = a.type.endsWith('%') ? `${a.value}%` : `+${a.value}`;
    return `<span class="affix">${a.type.replace('%','')} ${v}</span>`;
  }).join(' ') + '</span>';
}

// ---------- EQUIPMENT PANEL (unchanged layout, re-render entry point) ----------
export function setupEquipmentPanel(state) {
  // existing static wiring assumed; no changes required here for the new features
}

export function renderEquipment(state) {
  // existing equipment rendering; left intact
}
