// src/main.js
import { $, el, clear, openModal, bindDialogControls } from "../ui/dom.js";
import { buildSelect, renderAll } from "../ui/render.js";
import { setupEquipmentPanel, renderEquipment, setupInventoryPanel, renderInventory, setupShopPanel, renderShop } from "../ui/panels.js";
import { HEROES, CREATURES } from "../systems/constants.js";
import { themeForWave, previewWaveText } from "../systems/themeManager.js";
import { rollWaveEnemies } from "../systems/waveManager.js";
import { createLoot } from "../systems/loot.js";
import { createEquipment, createPotion } from "../models/item.js";
import { Inventory } from "../models/inventory.js";
import { Player } from "../models/player.js";
import { seeded, pick } from "../systems/rng.js";
import { Shop } from "../systems/shop.js";

const SAVE_KEY = "mythic-arena-save";

const state = {
  side: "hero",
  wave: 1,
  theme: themeForWave(1),
  player: null,
  lists: { hero: [], creature: [] },
  inventory: new Inventory(),
  shop: null,
  started: false,
  autoplay: false,
  speedMs: 800,
  nextPreview: null,
  nextPreviewText: "—",
};
window.state = state;

function randList(source, n=10){
  const s = [...source];
  const out = [];
  while(out.length < n && s.length){
    const i = Math.floor(Math.random()*s.length);
    out.push(s.splice(i,1)[0]);
  }
  return out;
}

function init(){
  seeded(Date.now());
  state.lists.hero = randList(HEROES, 10);
  state.lists.creature = randList(CREATURES, 10);

  state.shop = new Shop(
    (type)=>createEquipment(type, Math.floor(state.wave/10)),
    ()=>createPotion()
  );

  bindDialogControls();
  bindUI();

  buildSelect(state);
  renderAll({...state, player: state.player || { xp:0, xpNeeded:()=>50, hp:0, maxHP:()=>100, specialReady:()=>false }});

  updateNextPreview();
}

function bindUI(){
  $("#select-side").addEventListener("change", ()=>{
    state.side = $("#select-side").value;
    buildSelect(state);
    updateSpecialButton();
  });
  $("#select-hero").addEventListener("change", ()=>{
    if(state.side==="hero"){ $("#select-creature").selectedIndex = -1; }
    updateSpecialButton();
  });
  $("#select-creature").addEventListener("change", ()=>{
    if(state.side==="creature"){ $("#select-hero").selectedIndex = -1; }
    updateSpecialButton();
  });

  $("#input-name").addEventListener("input", ()=>{
    if(state.player){ state.player.name = $("#input-name").value.trim() || "Player"; renderAll(state); }
  });

  $("#btn-start").addEventListener("click", startGame);
  $("#btn-next").addEventListener("click", ()=>nextWave("normal"));
  $("#btn-special").addEventListener("click", ()=>nextWave("special"));
  $("#btn-auto").addEventListener("click", toggleAuto);
  $("#range-speed").addEventListener("input", (e)=>{
    const v = Number(e.target.value);
    state.speedMs = Math.floor(1200 - v*10.5);
  });

  $("#btn-equipment").addEventListener("click", ()=>{ setupEquipmentPanel(state); openModal("dlg-equipment"); });
  $("#btn-inventory").addEventListener("click", ()=>{ setupInventoryPanel(state); openModal("dlg-inventory"); });
  $("#btn-shop").addEventListener("click", ()=>{ setupShopPanel(state); openModal("dlg-shop"); });

  $("#btn-save").addEventListener("click", saveGame);
  $("#btn-load").addEventListener("click", loadGame);
}

function updateSpecialButton(){
  const cls = selectedClass();
  const btn = $("#btn-special");
  if(cls) btn.textContent = "Special";
}

function selectedClass(){
  if(state.side==="hero"){
    const v = $("#select-hero").value;
    return v || null;
  } else {
    const v = $("#select-creature").value;
    return v || null;
  }
}

function startGame(){
  const name = $("#input-name").value.trim() || "Player";
  const cls = selectedClass();
  if(!cls){ alert("Pick a class from your side."); return; }
  state.player = new Player(name, cls);
  state.started = true;
  $("#btn-next").disabled = false;
  $("#btn-special").disabled = !state.player.specialReady();

  state.player.gold = 50;
  const starterTypes = ["weapon","armor","trinket","boots","headgear","hands"];
  for(const t of starterTypes){
    const baseItem = createEquipment(t, 0);
    baseItem.rarityKey = (Math.random()<0.5) ? "Normal" : "Common";
    baseItem.name = `${baseItem.rarityKey} ${t[0].toUpperCase()+t.slice(1)}`;
    state.player.equipped[t] = baseItem;
  }

  for(let i=0;i<6;i++) state.inventory.add(createEquipment(pick(starterTypes), 0));
  state.shop.refresh(true);

  const trait = state.player.passives();
  $("#btn-special").textContent = trait.special?.name || "Special";

  updateNextPreview();
  renderAll(state);
}

function updateNextPreview(){
  const enemyBase = state.side==="hero" ? state.lists.creature : state.lists.hero;
  const roll = rollWaveEnemies(state.wave, state.side, enemyBase);
  state.nextPreview = roll.enemies;
  state.theme = roll.flags.theme;
  state.nextPreviewText = (awaitPreviewText(roll.enemies));
  renderAll(state);
}

function awaitPreviewText(list){
  // Inlined import fallback for simplicity (same as previewWaveText)
  if(!list || !list.length) return "—";
  const counts = new Map();
  for(const n of list) counts.set(n, (counts.get(n)||0)+1);
  const parts = [...counts.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).map(([name,c])=>`${c}x ${name}`);
  return parts.join(", ");
}

let autoTimer = null;
function toggleAuto(){
  state.autoplay = !state.autoplay;
  $("#btn-auto").textContent = `Auto: ${state.autoplay? "On":"Off"}`;
  if(state.autoplay){
    if(autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(()=>{
      if(!state.started) return;
      nextWave("normal");
    }, Math.max(150, state.speedMs));
  } else {
    if(autoTimer) clearInterval(autoTimer);
    autoTimer = null;
  }
}

function logLine(text){
  const ul = $("#log");
  const li = el("li",null,text);
  ul.append(li);
  while(ul.children.length > 200) ul.removeChild(ul.firstChild);
  ul.scrollTop = ul.scrollHeight;
}

function resolveDamage(player, diff, useSpecial){
  const atk = player.atk();
  const def = player.def();
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
    if(d.kind==="potion"){
      state.inventory.items.push(d);
    } else {
      const item = createEquipment(d.type, (flags.isBoss?2:0) + (flags.isSuper?4:0));
      state.inventory.items.push(item);
    }
  }
  return drops;
}

function restockIfNeeded(){
  if(state.wave % 20 === 0){
    state.shop.refresh(true);
    renderShop(state);
  }
}

function goldGainBase(flags){
  let g = 10 + Math.floor(state.wave * 1.2);
  if(flags.isElite) g += 8;
  if(flags.isBoss) g += 15;
  if(flags.isSuper) g += 30;
  g = Math.floor(g * (1 + state.player.goldPct()/100));
  return g;
}

function nextWave(mode="normal"){
  if(!state.started) return;

  const enemyBase = state.side==="hero" ? state.lists.creature : state.lists.hero;
  const roll = rollWaveEnemies(state.wave, state.side, enemyBase);
  const { flags } = roll;
  const useSpecial = (mode==="special");
  if(useSpecial && !state.player.specialReady()){
    logLine("❌ Special is on cooldown.");
    return;
  }

  const res = resolveDamage(state.player, flags.diff, useSpecial);
  const lsHeal = Math.floor(res.kills * (state.player.lifestealPct()/100) * 10);
  state.player.hp = Math.min(state.player.maxHP(), Math.max(0, state.player.hp - res.taken + lsHeal + (res.flatHeal||0)));

  const xp = 8 + Math.floor(flags.diff*3);
  const ding = state.player.addXP(xp);

  const goldGain = goldGainBase(flags);
  state.player.gold += goldGain;
  const drops = grantLoot(flags);

  if(useSpecial){
    state.player.setSpecialOnCooldown();
  } else {
    state.player.tickSpecialCD();
  }

  const tag = flags.isSuper ? "🟥 SUPER" : (flags.isBoss ? "🟧 Boss" : (flags.isElite?"🟨 Elite":"🟩"));
  logLine(`${tag} Wave ${state.wave}: dealt ${res.dealt}, took ${res.taken}, kills ${res.kills}, +${xp}xp, +${goldGain}g, loot x${drops.length}`);

  state.wave++;
  state.theme = themeForWave(state.wave);
  restockIfNeeded();
  updateNextPreview();
  renderAll(state);
  // safe re-renders if panels are open
  try{ renderEquipment(state); }catch(e){}
  try{ renderInventory(state); }catch(e){}
  try{ renderShop(state); }catch(e){}

  if(state.player.hp <= 0){
    const penalty = Math.min(state.player.gold, 30);
    state.player.gold -= penalty;
    state.player.hp = Math.floor(state.player.maxHP()*0.6);
    logLine(`💀 You were overwhelmed. Lost ${penalty}g, recovered to ${state.player.hp} HP.`);
  }
}

function saveGame(){
  if(!state.player){ alert("Start a run first."); return; }
  const data = {
    side: state.side,
    wave: state.wave,
    theme: state.theme,
    player: {
      name: state.player.name,
      className: state.player.className,
      level: state.player.level,
      xp: state.player.xp,
      gold: state.player.gold,
      hp: state.player.hp,
      talents: state.player.talents,
      equipped: state.player.equipped
    },
    inventory: state.inventory.items,
    stash: state.inventory.stash,
    buyback: state.inventory.buyback,
    shop: {
      stock: state.shop.stock,
      restockId: state.shop.restockId,
      featuredId: state.shop.featuredId
    },
    lists: state.lists
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  logLine("💾 Saved.");
}

function loadGame(){
  const raw = localStorage.getItem(SAVE_KEY);
  if(!raw){ alert("No save found."); return; }
  try{
    const data = JSON.parse(raw);
    state.side = data.side;
    state.wave = data.wave;
    state.theme = data.theme;
    state.player = new Player(data.player.name, data.player.className);
    Object.assign(state.player, {
      level:data.player.level, xp:data.player.xp, gold:data.player.gold,
      hp:data.player.hp, talents:data.player.talents, equipped:data.player.equipped
    });
    state.inventory.items = data.inventory||[];
    state.inventory.stash = data.stash||[];
    state.inventory.buyback = data.buyback||[];
    state.shop = new Shop(
      (type)=>createEquipment(type, Math.floor(state.wave/10)),
      ()=>createPotion()
    );
    state.shop.stock = data.shop.stock;
    state.shop.restockId = data.shop.restockId;
    state.shop.featuredId = data.shop.featuredId;
    state.lists = data.lists;

    $("#select-side").value = state.side;
    buildSelect(state);
    $("#input-name").value = state.player.name;
    state.started = true;
    updateNextPreview();
    renderAll(state);
    logLine("📂 Loaded save.");
  }catch(e){
    console.error(e);
    alert("Failed to load save.");
  }
}

init();
