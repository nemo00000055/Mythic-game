// systems/shop.js
import { createPotion, createEquipment } from '../models/item.js';
import { ITEM_TYPES } from './constants.js';
import { seeded, uid, pick } from './rng.js';

export class Shop {
  constructor() {
    this.stock = {
      consumables: [],
      weapon: [],
      armor: [],
      trinket: [],
      boots: [],
      headgear: [],
      hands: [],
      buyback: [], // not sold here; shown from inventory.buyback
    };
    this.restockId = 0;
    this.featuredId = null;
    this.refreshCostBase = 20;
    this.refresh(true);
  }

  static deserialize(data) {
    const s = new Shop();
    s.stock = data.stock;
    s.restockId = data.restockId;
    s.featuredId = data.featuredId;
    s.refreshCostBase = data.refreshCostBase || 20;
    return s;
  }
  serialize() {
    return {
      stock: this.stock,
      restockId: this.restockId,
      featuredId: this.featuredId,
      refreshCostBase: this.refreshCostBase
    };
  }

  refresh(big = true) {
    // big=true regenerates all tabs; featured is first generated equipment across tabs
    const prng = seeded(Date.now() + this.restockId);
    const genEquip = (slot, n) => {
      const arr = [];
      for (let i=0;i<n;i++) {
        const it = createEquipment(slot, 0);
        it.id = uid();
        arr.push(it);
        if (!this.featuredId) this.featuredId = it.id;
      }
      return arr;
    };

    // Consumables
    this.stock.consumables = [
      { id: uid(), type:'potion', name:'Minor Healing Potion', desc:'+30 HP on use', price: 25 },
      { id: uid(), type:'potion', name:'Major Healing Potion', desc:'+80 HP on use', price: 60 },
    ];

    // Equipment
    this.stock.weapon   = genEquip('weapon',   6);
    this.stock.armor    = genEquip('armor',    6);
    this.stock.trinket  = genEquip('trinket',  6);
    this.stock.boots    = genEquip('boots',    6);
    this.stock.headgear = genEquip('headgear', 6);
    this.stock.hands    = genEquip('hands',    6);

    this.restockId++;
  }

  refreshCost() {
    return this.refreshCostBase + (this.restockId * 10);
  }

  isFeatured(item) {
    return item && item.id === this.featuredId;
  }

  getStockForTab(tabKey) {
    return this.stock[tabKey] || [];
  }

  removeFromTab(tabKey, id) {
    const arr = this.stock[tabKey];
    const idx = arr.findIndex(x => x.id === id);
    if (idx >= 0) arr.splice(idx,1);
  }
}
