// models/player.js
import { CLASS_TRAITS, DEFAULT_TRAIT, ITEM_TYPES, SETS } from "../systems/constants.js";

export class Player {
  constructor(name, className){
    this.name = name || "Player";
    this.className = className || "Human";
    this.level = 1;
    this.xp = 0;
    this.gold = 0;
    this.hp = 100;
    this.talents = { offense:0, defense:0, utility:0 };
    this.equipped = Object.fromEntries(ITEM_TYPES.map(s=>[s,null]));
    this._specialCD = 0;
  }

  passives(){
    return CLASS_TRAITS[this.className] || DEFAULT_TRAIT;
  }

  maxHP(base=100){
    const gear = this.totalGear();
    const set = this.setBonus();
    let hp = base + (this.passives().hp||0) + gear.hp;
    hp += (set.hp || 0);
    hp += this.nodeBonus().hp;
    return Math.max(1, Math.floor(hp));
  }

  nodeBonus(){
    const nodes = Math.floor(this.level/10);
    return { atk: nodes*3, def: nodes*3, hp: nodes*15 };
  }

  totalGear(){
    let atk=0,def=0,hp=0, atkPct=0, defPct=0, lsPct=0, goldPct=0, regen=0;
    for(const slot of Object.keys(this.equipped)){
      const it = this.equipped[slot];
      if(!it) continue;
      atk += it.base.atk||0; def += it.base.def||0; hp += it.base.hp||0;
      if(it.affix){
        atkPct   += it.affix.atkPct||0;
        defPct   += it.affix.defPct||0;
        lsPct    += it.affix.lifestealPct||0;
        goldPct  += it.affix.goldPct||0;
        regen    += it.affix.regenFlat||0;
      }
    }
    return { atk,def,hp, atkPct,defPct,lsPct,goldPct, regen };
  }

  setBonus(){
    const counts = {};
    for(const slot of Object.keys(this.equipped)){
      const it = this.equipped[slot];
      if(!it || !it.setKey) continue;
      counts[it.setKey] = (counts[it.setKey]||0)+1;
    }
    const out = { atk:0,def:0,hp:0, lifesteal:0, gold:0, specialCD:0, dmgTakenMul:1 };
    for(const [setKey,cnt] of Object.entries(counts)){
      const s = SETS[setKey]; if(!s) continue;
      if(cnt>=2 && s.two){
        out.atk += s.two.atk||0;
        out.def += s.two.def||0;
        out.hp += s.two.hp||0;
        out.lifesteal += s.two.lifesteal||0;
        out.gold += s.two.gold||0;
        if(s.two.dmgTakenMul) out.dmgTakenMul *= s.two.dmgTakenMul;
      }
      if(cnt>=4 && s.four){
        out.atk += s.four.atk||0;
        out.def += s.four.def||0;
        out.hp += s.four.hp||0;
        out.lifesteal += s.four.lifesteal||0;
        out.gold += s.four.gold||0;
        if(s.four.specialCD) out.specialCD += s.four.specialCD;
        if(s.four.dmgTakenMul) out.dmgTakenMul *= s.four.dmgTakenMul;
      }
    }
    return out;
  }

  atk(baseAtk=0){
    const gear = this.totalGear();
    const set = this.setBonus();
    let a = baseAtk + (this.passives().atk||0) + gear.atk + this.nodeBonus().atk;
    a *= (1 + (gear.atkPct||0 + (this.talents.offense*4))/100);
    a *= (1 + (set.atk||0)/100);
    return Math.max(0, Math.floor(a));
  }

  def(baseDef=0){
    const gear = this.totalGear();
    const set = this.setBonus();
    let d = baseDef + (this.passives().def||0) + gear.def + this.nodeBonus().def;
    d *= (1 + (gear.defPct||0 + (this.talents.defense*4))/100);
    d *= (1 + (set.def||0)/100);
    return Math.max(0, Math.floor(d));
  }

  lifestealPct(){
    const gear = this.totalGear();
    const set = this.setBonus();
    const base = (this.passives().lifesteal||0);
    const utilBonus = this.talents.utility*2;
    return base + (gear.lsPct||0) + (set.lifesteal||0) + utilBonus;
  }

  goldPct(){
    const gear = this.totalGear();
    const set = this.setBonus();
    const base = (this.passives().gold||0);
    const utilGold = this.talents.utility*3;
    return base + (gear.goldPct||0) + (set.gold||0) + utilGold;
  }

  specialCD(){
    const base = this.passives().special?.cd ?? 4;
    const setCD = this.setBonus().specialCD || 0;
    return Math.max(1, base + setCD);
  }

  xpNeeded(){
    const L = this.level;
    if(L >= 100) return 0;
    return 50 + Math.floor(Math.pow(L, 1.35) * 25);
  }

  addXP(amt){
    if(this.level >= 100) return false;
    this.xp += Math.max(0, amt|0);
    let ding = false;
    while(this.xp >= this.xpNeeded() && this.level < 100){
      this.xp -= this.xpNeeded();
      this.level++;
      this.hp = this.maxHP();
      ding = true;
    }
    return ding;
  }

  talentPoints(){
    return Math.floor(this.level/5) - (this.talents.offense + this.talents.defense + this.talents.utility);
  }

  tickSpecialCD(){
    if(this._specialCD>0) this._specialCD--;
  }
  setSpecialOnCooldown(){
    this._specialCD = this.specialCD();
  }
  specialReady(){
    return this._specialCD <= 0;
  }
}
