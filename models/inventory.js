// models/inventory.js
export class Inventory {
  constructor(){
    this.items = [];
    this.stash = [];
    this.buyback = [];
  }
  add(item){
    if(!item) return;
    if(item.kind==="equipment" || item.kind==="potion"){
      this.items.push(item);
    }
  }
  remove(id){
    const i = this.items.findIndex(x=>x.id===id);
    if(i>=0) return this.items.splice(i,1)[0];
    return null;
  }
  find(id){
    return this.items.find(x=>x.id===id) || this.stash.find(x=>x.id===id);
  }
  sell(item){
    if(!item) return { ok:false, value:0 };
    const value = Math.floor(item.price * 0.5);
    this.buyback.unshift({ ...item, bbPrice: Math.floor(item.price*0.6) });
    this.buyback = this.buyback.slice(0,6);
    this.items = this.items.filter(x=>x.id!==item.id);
    this.stash = this.stash.filter(x=>x.id!==item.id);
    return { ok:true, value };
  }
  moveToStash(item){
    if(!item) return false;
    this.items = this.items.filter(x=>x.id!==item.id);
    this.stash.push(item);
    return true;
  }
  fromStash(item){
    if(!item) return false;
    this.stash = this.stash.filter(x=>x.id!==item.id);
    this.items.push(item);
    return true;
  }
}
