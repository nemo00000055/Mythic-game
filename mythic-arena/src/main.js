import { $, el, openModal, bindDialogControls } from "../ui/dom.js";
import { buildSelect, renderAll } from "../ui/render.js";
import { setupEquipmentPanel, renderEquipment, setupInventoryPanel, renderInventory, setupShopPanel, renderShop } from "../ui/panels.js";
import { HEROES, CREATURES } from "../systems/constants.js";
import { themeForWave, previewWaveText } from "../systems/themeManager.js";
import { rollWaveEnemies } from "../systems/waveManager.js";
import { createLoot } from "../systems/loot.js";
import { createEquipment, createPotion } from "../models/item.js";
import { Inventory } from "../models/inventory.js";
import { Player } from "../models/player.js";
import { seeded } from "../systems/rng.js";
import { Shop } from "../systems/shop.js";

const SAVE_KEY = "mythic-arena-save";

const state = {
  side: "hero", wave: 1, theme: themeForWave(1), player: null,
  lists: { hero: [], creature: [] }, inventory: new Inventory(), shop: null,
  started: false, autoplay: false, speedMs: 800, nextPreview: null, nextPreviewText: "—", ui: {}
};
window.state = state;

function randList(source, n=10){
  const s = [...source]; const out = [];
  while(out.length < n && s.length){ const i = Math.floor(Math.random()*s.length); out.push(s.splice(i,1)[0]); }
  return out;
}

function init(){
  seeded(Date.now());
  state.lists.hero = randList(HEROES, 10);
  state.lists.creature = randList(CREATURES, 10);
  state.shop = new Shop( (type)=>createEquipment(type, Math.floor(state.wave/10)), ()=>createPotion() );
  bindDialogControls(); bindUI();
  buildSelect(state);
  renderAll({...state, player: state.player || { xp:0, xpNeeded:()=>50, hp:0, maxHP:()=>100, specialReady:()=>false }});
  updateNextPreview();
}

function bindUI(){
  $("#select-side").addEventListener("change", ()=>{ state.side = $("#select-side").value; buildSelect(state); updateSpecialButton(); });
  $("#select-hero").addEventListener("change", ()=>{ if(state.side==="hero"){ $("#select-creature").selectedIndex = -1; } updateSpecialButton(); });
  $("#select-creature").addEventListener("change", ()=>{ if(state.side==="creature"){ $("#select-hero").selectedIndex = -1; } updateSpecialButton(); });
  $("#input-name").addEventListener("input", ()=>{ if(state.player){ state.player.name = $("#input-name").value.trim() || "Player"; renderAll(state); } });
  $("#btn-start").addEventListener("click", startGame);
  $("#btn-next").addEventListener("click", ()=>nextWave("normal"));
  $("#btn-special").addEventListener("click", ()=>nextWave("special"));
  $("#btn-auto").addEventListener("click", toggleAuto);
  document.getElementById("range-speed").addEventListener("input", (e)=>{ const v = Number(e.target.value); state.speedMs = Math.floor(1200 - v*10.5); });
  document.getElementById("btn-equipment").addEventListener("click", ()=>{ setupEquipmentPanel(state); openModal("dlg-equipment"); });
  document.getElementById("btn-inventory").addEventListener("click", ()=>{ setupInventoryPanel(state); openModal("dlg-inventory"); });
  document.getElementById("btn-shop").addEventListener("click", ()=>{ setupShopPanel(state); openModal("dlg-shop"); });
  document.getElementById("btn-save").addEventListener("click", saveGame);
  document.getElementById("btn-load").addEventListener("click", loadGame);
}

function updateSpecialButton(){
  const cls = selectedClass();
  const btn = document.getElementById("btn-special");
  if(cls && state.player){ btn.textContent = state.player.passives().special?.name || "Special"; }
}

function selectedClass(){ if(state.side==="hero"){ const v = document.getElementById("select-hero").value; return v || null; } else { const v = document.getElementById("select-creature").value; return v || null; } }

function startGame(){
  const name = document.getElementById("input-name").value.trim() || "Player";
  const cls = selectedClass(); if(!cls){ alert("Pick a class from your side."); return; }
  state.player = new Player(name, cls); state.started = true;
  document.getElementById("btn-next").disabled = false;
  document.getElementById("btn-special").disabled = !state.player.specialReady();
  document.getElementById("btn-special").textContent = state.player.passives().special?.name || "Special";
  updateNextPreview(); renderAll(state);
}

function updateNextPreview(){
  const enemyBase = state.side==="hero" ? state.lists.creature : state.lists.hero;
  const roll = rollWaveEnemies(state.wave, state.side, enemyBase);
  state.nextPreview = roll.enemies; state.theme = roll.flags.theme;
  state.nextPreviewText = (awaitPreviewText(roll.enemies));
  renderAll(state);
}

function awaitPreviewText(arr){ // simple formatting here
  const counts = new Map(); for(const n of arr) counts.set(n,(counts.get(n)||0)+1);
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([n,c])=>`${c}x ${n}`).join(", ");
}

let autoTimer = null;
function toggleAuto(){
  state.autoplay = !state.autoplay;
  document.getElementById("btn-auto").textContent = `Auto: ${state.autoplay? "On":"Off"}`;
  if(state.autoplay){ if(autoTimer) clearInterval(autoTimer); autoTimer = setInterval(()=>{ if(!state.started) return; nextWave("normal"); }, Math.max(150, state.speedMs)); }
  else { if(autoTimer) clearInterval(autoTimer); autoTimer = null; }
}

function logLine(text){
  const ul = document.getElementById("log"); const li = document.createElement("li"); li.textContent=text; ul.append(li);
  while(ul.children.length > 200) ul.removeChild(ul.firstChild); ul.scrollTop = ul.scrollHeight;
}

function resolveDamage(player, diff, useSpecial){
  const atk = player.atk(); const def = player.def();
  const baseDmg = Math.max(1, Math.floor(atk * (useSpecial ? (player.passives().special?.mult||1.5) : 1)));
  const mitig = Math.max(0, Math.floor(diff*8 - def*0.6));
  const dmgTakenMul = player.setBonus().dmgTakenMul || 1;
  const taken = Math.max(0, Math.floor(mitig * dmgTakenMul));
  const kills = Math.max(1, Math.floor((atk*0.12) + (useSpecial?2:1)));
  const flatHeal = useSpecial ? (player.passives().special?.flatHeal||0) : 0;
  return { dealt: baseDmg, taken, kills, flatHeal };
}

function grantLoot(flags){
  const drops = createLoot(flags);
  for(const d of drops){
    if(d.kind==="potion"){ state.inventory.items.push(d); }
    else { state.inventory.items.push(createEquipment(d.type, (flags.isBoss?2:0) + (flags.isSuper?4:0))); }
  }
  return drops;
}
function restockIfNeeded(){ if(state.wave % 20 === 0){ state.shop.refresh(true); renderShop(state); } }
function goldGainBase(flags){
  let g = 10 + Math.floor(state.wave * 1.2); if(flags.isElite) g += 8; if(flags.isBoss) g += 15; if(flags.isSuper) g += 30;
  g = Math.floor(g * (1 + state.player.goldPct()/100)); return g;
}

function nextWave(mode="normal"){
  if(!state.started) return;
  const enemyBase = state.side==="hero" ? state.lists.creature : state.lists.hero;
  const roll = rollWaveEnemies(state.wave, state.side, enemyBase);
  const { flags } = roll; const useSpecial = (mode==="special");
  if(useSpecial && !state.player.specialReady()){ logLine("❌ Special is on cooldown."); return; }
  const res = resolveDamage(state.player, flags.diff, useSpecial);
  const lsHeal = Math.floor(res.kills * (state.player.lifestealPct()/100) * 10);
  state.player.hp = Math.min(state.player.maxHP(), Math.max(0, state.player.hp - res.taken + lsHeal + (res.flatHeal||0)));
  const xp = 8 + Math.floor(flags.diff*3); const ding = state.player.addXP(xp);
  const goldGain = goldGainBase(flags); state.player.gold += goldGain; const drops = grantLoot(flags);
  if(useSpecial){ state.player.setSpecialOnCooldown(); } else { state.player.tickSpecialCD(); }
  const tag = flags.isSuper ? "🟥 SUPER" : (flags.isBoss ? "🟧 Boss" : (flags.isElite?"🟨 Elite":"🟩"));
  logLine(`${tag} Wave ${state.wave}: dealt ${res.dealt}, took ${res.taken}, kills ${res.kills}, +${xp}xp, +${goldGain}g, loot x${drops.length}`);
  state.wave++; state.theme = themeForWave(state.wave);
  restockIfNeeded(); updateNextPreview(); renderAll(state); renderEquipment(state); renderInventory(state); renderShop(state);
  if(state.player.hp <= 0){
    const penalty = Math.min(state.player.gold, 30); state.player.gold -= penalty;
    state.player.hp = Math.floor(state.player.maxHP()*0.6); logLine(`💀 You were overwhelmed. Lost ${penalty}g, recovered to ${state.player.hp} HP.`);
  }
}

function saveGame(){
  if(!state.player){ alert("Start a run first."); return; }
  const data = {
    side: state.side, wave: state.wave, theme: state.theme,
    player: { name: state.player.name, className: state.player.className, level: state.player.level, xp: state.player.xp, gold: state.player.gold, hp: state.player.hp, talents: state.player.talents, equipped: state.player.equipped },
    inventory: state.inventory.items, stash: state.inventory.stash, buyback: state.inventory.buyback,
    shop: { stock: state.shop.stock, restockId: state.shop.restockId, featuredId: state.shop.featuredId },
    lists: state.lists
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data)); logLine("💾 Saved.");
}
function loadGame(){
  const raw = localStorage.getItem(SAVE_KEY); if(!raw){ alert("No save found."); return; }
  try{
    const data = JSON.parse(raw);
    state.side = data.side; state.wave = data.wave; state.theme = data.theme;
    state.player = new Player(data.player.name, data.player.className);
    Object.assign(state.player, { level:data.player.level, xp:data.player.xp, gold:data.player.gold, hp:data.player.hp, talents:data.player.talents, equipped:data.player.equipped });
    state.inventory.items = data.inventory||[]; state.inventory.stash = data.stash||[]; state.inventory.buyback = data.buyback||[];
    state.shop = new Shop(()=>({}), ()=>({})); state.shop.stock = data.shop.stock; state.shop.restockId = data.shop.restockId; state.shop.featuredId = data.shop.featuredId;
    state.lists = data.lists; document.getElementById("select-side").value = state.side; buildSelect(state);
    document.getElementById("input-name").value = state.player.name; state.started = true; updateNextPreview(); renderAll(state); logLine("📂 Loaded save.");
  }catch(e){ console.error(e); alert("Failed to load save."); }
}
init();
