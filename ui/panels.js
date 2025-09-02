import { $, el, clear, formatGold } from "./dom.js";
import { ITEM_TYPES } from "../systems/constants.js";

function fmtDelta(n){ return (n>0?"+":"") + n; }
function describeItem(it){
  const d = el("div");
  const title = el("div",`badge rarity-${it.rarityKey?.replace(' ','')||'Normal'}`, `${it.name || 'Item'}`);
  d.append(title);
  if(it.base){ d.append(el("div","small",`ATK ${it.base.atk} • DEF ${it.base.def} • HP ${it.base.hp}`)); }
  if(it.setKey) d.append(el("div","badge set-tag", it.setKey));
  if(it.affix && Object.keys(it.affix).length){
    const a = it.affix; const lines = [];
    if(a.atkPct) lines.push(`+${a.atkPct}% ATK`);
    if(a.defPct) lines.push(`+${a.defPct}% DEF`);
    if(a.lifestealPct) lines.push(`+${a.lifestealPct}% Lifesteal`);
    if(a.goldPct) lines.push(`+${a.goldPct}% Gold`);
    if(a.regenFlat) lines.push(`+${a.regenFlat} Regen`);
    d.append(el("div","help",lines.join(" • ")));
  }
  if(it.price!=null) d.append(el("div","help",`Price: ${it.price}g`));
  if(it.locked) d.append(el("div","badge","🔒 Locked"));
  return d;
}
function compareBlock(newIt, cur){
  const wrap = el("div");
  if(cur && newIt && newIt.base){
    const da = newIt.base.atk - (cur.base?.atk||0);
    const dd = newIt.base.def - (cur.base?.def||0);
    const dh = newIt.base.hp  - (cur.base?.hp||0);
    wrap.append(el("div","help",`Δ ATK ${fmtDelta(da)} • DEF ${fmtDelta(dd)} • HP ${fmtDelta(dh)}`));
    const keys = ["atkPct","defPct","lifestealPct","goldPct","regenFlat"];
    const labels = {atkPct:"ATK%",defPct:"DEF%",lifestealPct:"LS%",goldPct:"GOLD%",regenFlat:"Regen"};
    const parts = [];
    for(const k of keys){
      const av = (newIt.affix?.[k]||0) - (cur?.affix?.[k]||0);
      if(av) parts.push(`${labels[k]} ${av>0?'+':''}${av}`);
    }
    if(parts.length) wrap.append(el("div","help", parts.join(" • ")));
  }
  return wrap;
}

export function setupEquipmentPanel(state){ renderEquipment(state); }
export function renderEquipment(state){
  const root = $("#panel-equipment"); if(!root) return; clear(root);
  const eqCard = el("div","card");
  const grid = el("div","flex");
  for(const slot of ITEM_TYPES){
    const box = el("div","card"); box.style.minWidth="210px";
    box.append(el("div","small", slot.toUpperCase()));
    const it = state.player.equipped[slot];
    if(it){
      box.append(describeItem(it));
      const uneq = el("button","btn small","Unequip");
      uneq.onclick = ()=>{ state.inventory.items.push(it); state.player.equipped[slot]=null; renderEquipment(state); };
      box.append(uneq);
    } else { box.append(el("div","help","— empty —")); }
    grid.append(box);
  }
  eqCard.append(grid);

  const tCard = el("div","card");
  const tp = state.player.talentPoints();
  tCard.append(el("div","small",`Talent Points: ${tp}`));
  const rows = el("div","flex");
  for(const k of ["offense","defense","utility"]){
    const col = el("div","card"); col.style.minWidth="220px";
    col.append(el("div","small", k.toUpperCase()));
    const v = state.player.talents[k];
    const line = el("div","flex");
    const minus = el("button","btn small","-"); minus.disabled = v<=0;
    const val = el("div","chip", String(v));
    const plus = el("button","btn small","+"); plus.disabled = tp<=0;
    minus.onclick = ()=>{ state.player.talents[k]--; renderEquipment(state); };
    plus.onclick  = ()=>{ state.player.talents[k]++; renderEquipment(state); };
    line.append(minus,val,plus);
    col.append(line);
    const hint = {offense:"+4% ATK / point", defense:"+4% DEF / point", utility:"+3% gold & +2% lifesteal / point"}[k];
    col.append(el("div","help",hint));
    rows.append(col);
  }
  const actions = el("div","toolbar");
  const spent = state.player.talents.offense + state.player.talents.defense + state.player.talents.utility;
  const respecCost = 50 * spent;
  const resetBtn = el("button","btn","Reset (free)");
  const respecBtn = el("button","btn",`Respec (cost ${respecCost}g)`);
  resetBtn.onclick = ()=>{ state.player.talents = {offense:0,defense:0,utility:0}; renderEquipment(state); };
  respecBtn.onclick = ()=>{
    if(state.player.gold >= respecCost){ state.player.gold -= respecCost; state.player.talents = {offense:0,defense:0,utility:0}; renderEquipment(state); }
    else alert("Not enough gold for respec.");
  };
  actions.append(resetBtn,respecBtn);
  tCard.append(rows, actions);
  root.append(eqCard, tCard);
}

export function setupInventoryPanel(state){
  state.ui = state.ui || {};
  if(!state.ui.invView) state.ui.invView = "Inventory";
  if(!state.ui.invSlot) state.ui.invSlot = "All";
  state.ui.invSelectedId = state.ui.invSelectedId || null;
  renderInventory(state);
}
export function renderInventory(state){
  const root = $("#panel-inventory"); if(!root) return; clear(root);

  const views = ["Inventory","Stash","Buyback"];
  const vTabs = el("div","tabs");
  views.forEach(v=>{ const b = el("button","tab"+(state.ui.invView===v?" active":""), v); b.onclick = ()=>{ state.ui.invView=v; state.ui.invSelectedId=null; renderInventory(state); }; vTabs.append(b); });
  root.append(vTabs);

  if(state.ui.invView === "Buyback"){
    const list = el("div","list");
    for(const it of state.inventory.buyback){
      const li = el("div","list-item"); const meta = el("div","meta");
      meta.append(el("span","badge", it.rarityKey||"—")); meta.append(el("span","name", it.name));
      li.append(meta, el("span","price", `${it.bbPrice}g`));
      li.onclick = ()=>{
        if(state.player.gold >= it.bbPrice){ state.player.gold -= it.bbPrice; state.inventory.items.push(it); state.inventory.buyback = state.inventory.buyback.filter(x=>x.id!==it.id); renderInventory(state); }
        else alert("Not enough gold.");
      };
      list.append(li);
    }
    root.append(list); return;
  }

  const slotTabs = ["All","weapon","armor","trinket","boots","headgear","hands","potion"];
  const sTabs = el("div","tabs");
  slotTabs.forEach(s=>{ const b = el("button","tab"+(state.ui.invSlot===s?" active":""), s[0].toUpperCase()+s.slice(1)); b.onclick = ()=>{ state.ui.invSlot=s; state.ui.invSelectedId=null; renderInventory(state); }; sTabs.append(b); });
  root.append(sTabs);

  const split = el("div","split"); const list = el("div","list"); const detail = el("div","card");

  const equippedIds = new Set(Object.values(state.player.equipped).filter(Boolean).map(x=>x.id));
  let items = (state.ui.invView==="Inventory" ? state.inventory.items : state.inventory.stash);
  items = items.filter(x=> state.ui.invView==="Inventory" ? !equippedIds.has(x.id) : true);
  items = items.filter(x=> state.ui.invSlot==="All" ? true : (x.kind==="potion" ? state.ui.invSlot==="potion" : x.type===state.ui.invSlot));

  if(!items.length){ list.append(el("div","help","No items.")); }
  else {
    for(const it of items){
      const li = el("div","list-item"); const meta = el("div","meta");
      meta.append(el("span","badge", it.rarityKey || (it.kind==="potion"?"Potion":"—")));
      meta.append(el("span","name", it.name));
      if(it.type) meta.append(el("span","help", it.type));
      li.append(meta, el("span","price", `${it.price||0}g`));
      li.onclick = ()=>{ state.ui.invSelectedId = it.id; renderInventory(state); };
      list.append(li);
    }
  }

  const selected = items.find(x=>x.id===state.ui.invSelectedId);
  if(!selected){ detail.append(el("div","help","Select an item to see details.")); }
  else if(selected.kind==="potion"){
    detail.append(el("div","small", selected.name));
    detail.append(el("div","help",`Heals ${(selected.healPct*100)|0}%`));
    detail.append(el("div","help",`Price: ${selected.price||0}g`));
    const useB = el("button","btn","Use");
    useB.onclick = ()=>{
      const heal = Math.floor(state.player.maxHP()* (selected.healPct||0.35));
      state.player.hp = Math.min(state.player.maxHP(), state.player.hp + heal);
      if(state.ui.invView==="Inventory"){ state.inventory.items = state.inventory.items.filter(x=>x.id!==selected.id); }
      else { state.inventory.stash = state.inventory.stash.filter(x=>x.id!==selected.id); }
      state.ui.invSelectedId = null; renderInventory(state);
    };
    detail.append(useB);
  } else {
    detail.append(describeItem(selected));
    const row = el("div","flex");
    const equipBtn = el("button","btn","Equip");
    equipBtn.onclick = ()=>{
      const cur = state.player.equipped[selected.type];
      if(cur) (state.ui.invView==="Inventory" ? state.inventory.items : state.inventory.stash).push(cur);
      state.player.equipped[selected.type] = selected;
      if(state.ui.invView==="Inventory"){ state.inventory.items = state.inventory.items.filter(x=>x.id!==selected.id); }
      else { state.inventory.stash = state.inventory.stash.filter(x=>x.id!==selected.id); }
      state.ui.invSelectedId = null; renderInventory(state);
    };
    const lockBtn = el("button","btn", selected.locked ? "Unlock" : "Lock");
    lockBtn.onclick = ()=>{ selected.locked=!selected.locked; renderInventory(state); };
    const moveBtn = el("button","btn", state.ui.invView==="Inventory" ? "To Stash" : "To Inventory");
    moveBtn.onclick = ()=>{
      if(state.ui.invView==="Inventory"){ state.inventory.moveToStash(selected); } else { state.inventory.fromStash(selected); }
      state.ui.invSelectedId = null; renderInventory(state);
    };
    const sellBtn = el("button","btn","Sell 50%");
    sellBtn.onclick = ()=>{
      if(selected.locked){ alert("Item is locked."); return; }
      const r = state.inventory.sell(selected);
      if(r.ok){ state.player.gold += r.value; state.ui.invSelectedId = null; renderInventory(state); }
    };
    row.append(equipBtn, lockBtn, moveBtn, sellBtn);
    detail.append(row);
    const cur = state.player.equipped[selected.type];
    detail.append(el("div","sep"));
    detail.append(el("div","small","Compare vs equipped:"));
    detail.append(compareBlock(selected, cur||{}));
  }

  split.append(list, detail); root.append(split);
}

export function setupShopPanel(state){
  state.ui = state.ui || {};
  if(!state.ui.shopTab) state.ui.shopTab = "Consumables";
  state.ui.shopSelectedId = state.ui.shopSelectedId || null;
  renderShop(state);
}
export function renderShop(state){
  const root = $("#panel-shop"); if(!root) return; clear(root);
  const head = el("div","toolbar"); head.append(el("div","chip",`Gold: ${formatGold(state.player.gold)}g`));
  const refreshCost = state.shop.refreshCost();
  const refreshBtn = el("button","btn",`Refresh (${refreshCost}g)`);
  refreshBtn.onclick = ()=>{
    if(state.player.gold >= refreshCost){ state.player.gold -= refreshCost; state.shop.refresh(true); state.ui.shopSelectedId = null; renderShop(state); }
    else alert("Not enough gold.");
  };
  head.append(refreshBtn); root.append(head);

  const tabs = ["Consumables","Weapon","Armor","Trinket","Boots","Headgear","Hands"];
  const t = el("div","tabs");
  tabs.forEach(name=>{ const b = el("button","tab"+(state.ui.shopTab===name?" active":""), name); b.onclick = ()=>{ state.ui.shopTab=name; state.ui.shopSelectedId=null; renderShop(state); }; t.append(b); });
  root.append(t);

  const split = el("div","split"); const list = el("div","list"); const detail = el("div","card");
  const items = state.shop.stock[state.ui.shopTab] || [];
  if(!items.length){ list.append(el("div","help","No items. Try Refresh.")); }
  else {
    for(const it of items){
      const li = el("div","list-item"); const meta = el("div","meta");
      if(state.ui.shopTab!=="Consumables"){ meta.append(el("span","badge", it.rarityKey)); } else { meta.append(el("span","badge", "Potion")); }
      meta.append(el("span","name", it.name));
      if(it.type) meta.append(el("span","help", it.type));
      let price = it.price; if(state.ui.shopTab!=="Consumables" && it.id === state.shop.featuredId) price = Math.floor(price*0.7);
      li.append(meta, el("span","price", `${price}g`));
      li.onclick = ()=>{ state.ui.shopSelectedId = it.id; renderShop(state); };
      list.append(li);
    }
  }

  const selected = items.find(x=>x.id===state.ui.shopSelectedId);
  if(!selected){ detail.append(el("div","help","Select an item to see details.")); }
  else if(state.ui.shopTab==="Consumables"){
    detail.append(el("div","small", selected.name));
    detail.append(el("div","help",`Heals ${(selected.healPct*100)|0}%`));
    detail.append(el("div","help",`Price: ${selected.price}g`));
    const buy = el("button","btn","Buy");
    buy.onclick = ()=>{
      if(state.player.gold >= selected.price){
        state.player.gold -= selected.price;
        state.inventory.items.push({ ...selected, id: String(Math.random()).slice(2) });
        state.shop.stock.Consumables = state.shop.stock.Consumables.filter(x=>x!==selected);
        state.ui.shopSelectedId = null; renderShop(state);
      } else alert("Not enough gold.");
    };
    detail.append(buy);
  } else {
    detail.append(describeItem(selected));
    let price = selected.price; if(selected.id === state.shop.featuredId) price = Math.floor(price*0.7);
    detail.append(el("div","help",`Price: ${price}g ${selected.id===state.shop.featuredId?'(Featured -30%)':''}`));
    const buy = el("button","btn","Buy");
    buy.onclick = ()=>{
      if(state.player.gold >= price){
        state.player.gold -= price;
        state.inventory.items.push(selected);
        state.shop.stock[state.ui.shopTab] = state.shop.stock[state.ui.shopTab].filter(x=>x.id!==selected.id);
        state.ui.shopSelectedId = null; renderShop(state);
      } else alert("Not enough gold.");
    };
    detail.append(buy);
  }

  split.append(list, detail); root.append(split);
}
