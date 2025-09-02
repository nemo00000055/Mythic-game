// systems/loot.js
import { ITEM_TYPES, RARITIES } from "./constants.js";
import { uid, weightedPick, pick } from "./rng.js";

export function createLoot({ isBoss, isElite, isSuper }){
  const drops = [];
  if(Math.random() < 0.25 + (isBoss?0.15:0) + (isSuper?0.1:0)){
    drops.push({ id:uid(), kind:"potion", name:"Healing Potion", healPct:0.35, price:20 });
  }
  const rolls = 1 + (isElite?1:0) + (isBoss?1:0) + (isSuper?2:0);
  for(let i=0;i<rolls;i++){
    const type = pick(ITEM_TYPES);
    const rarityWeights = RARITIES.map(r=>{
      let w = r.weight;
      if(isElite) w *= 1.1;
      if(isBoss)  w *= 1.25;
      if(isSuper) w *= 1.6;
      return { key:r.key, weight:w };
    });
    const rarityKey = weightedPick(rarityWeights);
    drops.push({ id:uid(), kind:"equipment", type, rarityKey });
  }
  return drops;
}
