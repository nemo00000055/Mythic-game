export class Shop {
  constructor(makeItem, makePotion){
    this.makeItem = makeItem; this.makePotion = makePotion;
    this.stock = { Consumables: [], Weapon: [], Armor: [], Trinket: [], Boots: [], Headgear: [], Hands: [] };
    this.restockId = 0; this.featuredId = null; this.refresh();
  }
  refresh(big=true){
    for(const k of Object.keys(this.stock)) this.stock[k] = [];
    for(let i=0;i<3;i++) this.stock.Consumables.push(this.makePotion());
    const per = big?6:4; const map = { Weapon:"weapon", Armor:"armor", Trinket:"trinket", Boots:"boots", Headgear:"headgear", Hands:"hands" };
    this.featuredId = null;
    for(const [tab,type] of Object.entries(map)){
      for(let i=0;i<per;i++){ const it = this.makeItem(type); this.stock[tab].push(it); if(!this.featuredId) this.featuredId = it.id; }
    }
    this.restockId++;
  }
  refreshCost(){ return 20 + 10 * this.restockId; }
}
