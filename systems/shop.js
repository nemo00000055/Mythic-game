// systems/shop.js
export class Shop {
  constructor(makeItem, makePotion){
    this.makeItem = makeItem;
    this.makePotion = makePotion;
    this.stock = {
      Consumables: [],
      Weapon: [],
      Armor: [],
      Trinket: [],
      Boots: [],
      Headgear: [],
      Hands: [],
      Buyback: []
    };
    this.restockId = 0;
    this.featuredId = null;
    this.refresh();
  }
  refresh(big=true){
    for(const k of Object.keys(this.stock)) if(k!=="Buyback") this.stock[k] = [];
    for(let i=0;i<3;i++) this.stock.Consumables.push(this.makePotion());
    const per = big?6:4;
    const map = { Weapon:"weapon", Armor:"armor", Trinket:"trinket", Boots:"boots", Headgear:"headgear", Hands:"hands" };
    for(const [tab,type] of Object.entries(map)){
      for(let i=0;i<per;i++){
        this.stock[tab].push(this.makeItem(type));
      }
    }
    const firstTab = ["Weapon","Armor","Trinket","Boots","Headgear","Hands"].find(t=>this.stock[t].length);
    this.featuredId = firstTab ? this.stock[firstTab][0].id : null;
    this.restockId++;
  }
  refreshCost(){
    return 20 + 10 * this.restockId;
  }
}
