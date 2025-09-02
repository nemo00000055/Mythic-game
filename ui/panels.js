// ui/panels.js
import { $, $$, el, clear, formatGold } from "./dom.js";
import { ITEM_TYPES } from "../systems/constants.js";

export function setupEquipmentPanel(state){
  renderEquipment(state);
}
export function renderEquipment(state){
  const root = $("#panel-equipment"); if(!root) return;
  clear(root);

  const eqCard = el("div","card");
  eqCard.append(el("div","small help","Equipped (2p/4p set bonuses apply automatically)."));
  const grid = el("div","flex");
  for(const slot of ITEM_TYPES){
    const box = el("div","card");
    box.style.minWidth = "210px";
    const title = el("div","small", slot.toUpperCase());
    title.style.color = "#9aa3ad";
    box.append(title);
    const it = state.player.equipped[slot];
    if(it){
      box.append(describeItem(it,true));
      const uneq = el("button","btn small","Unequip");
      uneq.onclick = ()=>{
        state.inventory.items.push(it);
        state.player.equipped[slot] = null;
        renderEquipment(state);
      };
      box.append(uneq);
    }else{
      box.append(el("div","help","— empty —"));
    }
    grid.append(box);
  }
  eqCard.append(grid);

  const setsCard = el("div","card");
  setsCard.append(el("div","small help","Active Sets"));
  const sets = computeSetCounts(state);
  const wrap = el("div","flex");
  if(Object.keys(sets).length===0){
    wrap.append(el("div","help","None"));
  } else {
    for(const [k,c] of Object.entries(sets)){
      const tag = el("span","badge set-tag", `${k} (${c})`);
      wrap.append(tag);
    }
  }
  setsCard.append(wrap);

  const tCard = el("div","card");
  const tp = state.player.talentPoints();
  tCard.append(el("div","small",`Talent Points: ${tp}`));
  const rows = el("div","flex");
  for(const k of ["offense","defense","utility"]){
    const col = el("div","card");
    col.style.minWidth="220px";
    col.append(el("div","small", k.toUpperCase()));
    const v = state.player.talents[k];
    const line = el("div","flex");
    const minus = el("button","btn small","-");
    minus.disabled = v<=0;
    const val = el("div","chip", String(v));
    const plus = el("button","btn small","+");
    plus.disabled = tp<=0;
    minus.onclick = ()=>{ state.player.talents[k]--; renderEquipment(state); };
    plus.onclick  = ()=>{ state.player.talents[k]++; renderEquipment(state); };
    line.append(minus,val,plus);
    col.append(line);
    const hint = {
      offense:"+4% ATK / point",
      defense:"+4% DEF / point",
      utility:"+3% gold & +2% lifesteal / point"
    }[k];
    col.append(el("div","help",hint));
    rows.append(col);
  }
  const actions = el("div","toolbar");
  const spent = state.player.talents.offense + state.player.talents.defense + state.player.talents.utility;
  const respecCost = 50 * spent;
  const resetBtn = el("button","btn","Reset (free)");
  const respecBtn = el("button","btn",`Respec (cost ${respecCost}g)`);
  resetBtn.onclick = ()=>{
    state.player.talents = {offense:0,defense:0,utility:0};
    renderEquipment(state);
  };
  respecBtn.onclick = ()=>{
    if(state.player.gold >= respecCost){
      state.player.gold -= respecCost;
      state.player.talents = {offense:0,defense:0,utility:0};
      renderEquipment(state);
    } else {
      alert("Not enough gold for respec.");
    }
  };
  actions.append(resetBtn,respecBtn);
  tCard.append(rows, actions);

  root.append(eqCard, setsCard, tCard);
}

function computeSetCounts(state){
  const counts = {};
  for(const slot of Object.keys(state.player.equipped)){
    const it = state.player.equipped[slot];
    if(it?.setKey) counts[it.setKey] = (counts[it.setKey]||0)+1;
  }
  return counts;
}

function describeItem(it, compact=false){
  const d = el("div");
  const title = el("div",`badge rarity-${it.rarityKey.replace(' ','')}`, `${it.name}`);
  d.append(title);
  const base = el("div","small",`ATK ${it.base.atk} • DEF ${it.base.def} • HP ${it.base.hp}`);
  d.append(base);
  if(it.setKey) d.append(el("div","badge set-tag", it.setKey));
  if(it.affix && Object.keys(it.affix).length){
    const a = it.affix;
    const lines = [];
    if(a.atkPct) lines.push(`+${a.atkPct}% ATK`);
    if(a.defPct) lines.push(`+${a.defPct}% DEF`);
    if(a.lifestealPct) lines.push(`+${a.lifestealPct}% Lifesteal`);
    if(a.goldPct) lines.push(`+${a.goldPct}% Gold`);
    if(a.regenFlat) lines.push(`+${a.regenFlat} Regen`);
    d.append(el("div","help",lines.join(" • ")));
  }
  d.append(el("div","help",`Price: ${it.price}g`));
  return d;
}

export function setupInventoryPanel(state){
  renderInventory(state);
}

export function renderInventory(state){
  const root = $("#panel-inventory"); if(!root) return;
  clear(root);

  const bar = el("div","toolbar");
  const slotSel = el("select"); slotSel.innerHTML = `<option value="">All Slots</option>` + 
    ["weapon","armor","trinket","boots","headgear","hands"].map(s=>`<option>${s}</option>`).join("");
  const rarSel = el("select"); rarSel.innerHTML = `<option value="">All Rarities</option>` + 
    ["Normal","Common","Rare","Epic","Legendary","Mythical","World"].map(r=>`<option>${r}</option>`).join("");
  const sortSel = el("select"); sortSel.innerHTML = `<option value="rarity">Sort by Rarity</option><option value="slot">Sort by Slot</option><option value="price">Sort by Price</option>`;
  bar.append(slotSel, rarSel, sortSel);
  root.append(bar);

  const list = el("div","flex");
  const equippedIds = new Set(Object.values(state.player.equipped).filter(Boolean).map(x=>x.id));
  let items = state.inventory.items.filter(x=>x.kind!=="potion" && !equippedIds.has(x.id));
  if(slotSel.value) items = items.filter(x=>x.type===slotSel.value);
  if(rarSel.value) items = items.filter(x=>x.rarityKey===rarSel.value);
  items.sort((a,b)=>{
    if(sortSel.value==="price") return b.price - a.price;
    if(sortSel.value==="slot") return a.type.localeCompare(b.type) || a.rarityKey.localeCompare(b.rarityKey);
    const order = i => ["Normal","Common","Rare","Epic","Legendary","Mythical","World"].indexOf(i.rarityKey);
    return order(b)-order(a);
  });

  function reRender(){ renderInventory(state); }

  for(const it of items){
    const c = el("div","card");
    c.append(el("div","small", it.type.toUpperCase()));
    c.append(describeItem(it));
    const cur = state.player.equipped[it.type];
    if(cur){
      const delta = el("div","help");
      const da = it.base.atk - cur.base.atk;
      const dd = it.base.def - cur.base.def;
      const dh = it.base.hp  - cur.base.hp;
      delta.textContent = `Δ ATK ${fmtDelta(da)} • DEF ${fmtDelta(dd)} • HP ${fmtDelta(dh)}`;
      c.append(delta);
    }
    const row = el("div","flex");
    const equipBtn = el("button","btn small","Equip");
    equipBtn.onclick = ()=>{
      const cur = state.player.equipped[it.type];
      if(cur) state.inventory.items.push(cur);
      state.player.equipped[it.type] = it;
      state.inventory.items = state.inventory.items.filter(x=>x.id!==it.id);
      reRender();
    };
    const stashBtn = el("button","btn small","Move to Stash");
    stashBtn.onclick = ()=>{ state.inventory.moveToStash(it); reRender(); };
    const sellBtn = el("button","btn small","Sell 50%");
    sellBtn.onclick = ()=>{
      const r = state.inventory.sell(it);
      if(r.ok){ state.player.gold += r.value; reRender(); }
    };
    row.append(equipBtn, stashBtn, sellBtn);
    c.append(row);
    list.append(c);
  }

  root.append(list);

  root.append(el("div","sep"));
  root.append(el("div","small",`Stash (${state.inventory.stash.length})`));
  const stashWrap = el("div","flex");
  for(const it of state.inventory.stash){
    const c = el("div","card");
    c.append(describeItem(it,true));
    const row = el("div","flex");
    const backBtn = el("button","btn small","To Inventory");
    backBtn.onclick = ()=>{ state.inventory.fromStash(it); renderInventory(state); };
    const sellBtn = el("button","btn small","Sell 50%");
    sellBtn.onclick = ()=>{
      const r = state.inventory.sell(it);
      if(r.ok){ state.player.gold += r.value; renderInventory(state); }
    };
    row.append(backBtn,sellBtn);
    c.append(row);
    stashWrap.append(c);
  }
  root.append(stashWrap);

  root.append(el("div","sep"));
  root.append(el("div","small",`Buyback (last 6)`));
  const bbWrap = el("div","flex");
  for(const it of state.inventory.buyback){
    const c = el("div","card");
    c.append(describeItem(it,true));
    const buyBtn = el("button","btn small",`Buyback ${it.bbPrice}g`);
    buyBtn.onclick = ()=>{
      if(state.player.gold >= it.bbPrice){
        state.player.gold -= it.bbPrice;
        state.inventory.items.push(it);
        state.inventory.buyback = state.inventory.buyback.filter(x=>x.id!==it.id);
        renderInventory(state);
      } else alert("Not enough gold.");
    };
    c.append(buyBtn);
    bbWrap.append(c);
  }
  root.append(bbWrap);

  slotSel.onchange = () => renderInventory(state);
  rarSel.onchange  = () => renderInventory(state);
  sortSel.onchange = () => renderInventory(state);
}

export function setupShopPanel(state){
  renderShop(state);
}
export function renderShop(state){
  const root = $("#panel-shop"); if(!root) return;
  clear(root);

  const head = el("div","toolbar");
  head.append(el("div","chip",`Gold: ${formatGold(state.player.gold)}g`));
  const refreshCost = state.shop.refreshCost();
  const refreshBtn = el("button","btn",`Refresh (${refreshCost}g)`);
  refreshBtn.onclick = ()=>{
    if(state.player.gold >= refreshCost){
      state.player.gold -= refreshCost;
      state.shop.refresh(true);
      renderShop(state);
    } else alert("Not enough gold.");
  };
  head.append(refreshBtn);
  root.append(head);

  const tabs = ["Consumables","Weapon","Armor","Trinket","Boots","Headgear","Hands","Buyback"];
  for(const tab of tabs){
    const section = el("div","card");
    section.append(el("h4",null,tab));
    const wrap = el("div","flex");
    const items = tab==="Buyback" ? state.inventory.buyback : state.shop.stock[tab];
    if(!items || !items.length){
      wrap.append(el("div","help","No items."));
    } else {
      for(const it of items){
        const c = el("div","card");
        if(tab!=="Consumables" && it.id === state.shop.featuredId){
          c.style.outline = "1px solid #24d8a7";
          c.append(el("div","badge", "Featured -30%"));
        }
        if(tab==="Consumables"){
          c.append(el("div","small", it.name));
          c.append(el("div","help",`Heals ${(it.healPct*100)|0}%`));
          c.append(el("div","help",`Price: ${it.price}g`));
          const buy = el("button","btn small","Buy");
          buy.onclick = ()=>{
            if(state.player.gold >= it.price){
              state.player.gold -= it.price;
              state.inventory.items.push({ ...it, id: (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()) });
              state.shop.stock.Consumables = state.shop.stock.Consumables.filter(x=>x!==it);
              renderShop(state);
            } else alert("Not enough gold.");
          };
          c.append(buy);
        } else if(tab==="Buyback"){
          c.append(el("div","small", it.name));
          c.append(el("div","help",`Buyback: ${it.bbPrice}g`));
          const buy = el("button","btn small","Buyback");
          buy.onclick = ()=>{
            if(state.player.gold >= it.bbPrice){
              state.player.gold -= it.bbPrice;
              state.inventory.items.push(it);
              state.inventory.buyback = state.inventory.buyback.filter(x=>x.id!==it.id);
              renderShop(state);
            } else alert("Not enough gold.");
          };
          c.append(buy);
        } else {
          c.append(el("div","small", it.type.toUpperCase()));
          c.append(el("div","badge", it.rarityKey));
          if(it.setKey) c.append(el("div","badge set-tag", it.setKey));
          c.append(el("div","help",`ATK ${it.base.atk} • DEF ${it.base.def} • HP ${it.base.hp}`));
          let price = it.price;
          if(it.id === state.shop.featuredId) price = Math.floor(price*0.7);
          c.append(el("div","help",`Price: ${price}g`));
          const buy = el("button","btn small","Buy");
          buy.onclick = ()=>{
            if(state.player.gold >= price){
              state.player.gold -= price;
              state.inventory.items.push(it);
              state.shop.stock[tab] = state.shop.stock[tab].filter(x=>x.id!==it.id);
              renderShop(state);
            } else alert("Not enough gold.");
          };
          c.append(buy);
        }
        wrap.append(c);
      }
    }
    section.append(wrap);
    root.append(section);
  }
}

function fmtDelta(n){ return (n>0?"+":"") + n; }
