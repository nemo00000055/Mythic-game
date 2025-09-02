import { RARITIES, SETS } from "../systems/constants.js";
import { uid, weightedPick } from "../systems/rng.js";
const AFFIX_KEYS = ["atkPct","defPct","lifestealPct","goldPct","regenFlat"];
function rollRarity(bonus=0){
  const weights = RARITIES.map(r => { let w = r.weight * Math.pow(1.08, bonus); const idx = RARITIES.indexOf(r); w *= (1 + idx*0.02*bonus); return { key:r.key, weight: w }; });
  return weightedPick(weights);
}
export function createPotion(){ return { id: uid(), kind:"potion", name:"Healing Potion", healPct:0.35, price:20 }; }
export function createEquipment(type, bonus=0){
  const rarityKey = rollRarity(bonus);
  const r = RARITIES.find(x=>x.key===rarityKey) || RARITIES[0];
  const baseAtk = r.atk + Math.floor(Math.random()*2);
  const baseDef = r.def + Math.floor(Math.random()*2);
  const baseHP  = r.hp  + Math.floor(Math.random()*4);
  const price = r.price + Math.floor((baseAtk+baseDef+baseHP) * 1.5);
  const item = { id: uid(), kind:"equipment", type, rarityKey, name:`${rarityKey} ${type[0].toUpperCase()+type.slice(1)}`, base:{ atk:baseAtk, def:baseDef, hp:baseHP }, affix:{}, setKey:null, price, locked:false };
  if(Math.random() < 0.45){ const setNames = Object.keys(SETS); item.setKey = setNames[(Math.random()*setNames.length)|0]; }
  const rarityIndex = RARITIES.findIndex(x=>x.key===rarityKey);
  if(rarityIndex >= 2){
    const rolls = 1 + Math.min(3, rarityIndex);
    for(let i=0;i<rolls;i++){
      const k = AFFIX_KEYS[(Math.random()*AFFIX_KEYS.length)|0];
      const val = (k==="regenFlat") ? (1 + (Math.random()*3|0)) : (3 + (Math.random()*7|0));
      item.affix[k] = (item.affix[k]||0) + val;
    }
    item.price += 30*rolls;
  }
  return item;
}
