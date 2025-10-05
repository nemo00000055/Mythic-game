let _seed = Date.now() % 2147483647;
export function seeded(n){ _seed = (typeof n === "number" ? n : Date.now()) % 2147483647; }
export function rngInt(n){ _seed = (_seed * 48271) % 2147483647; return _seed % n; }
export function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
export function pick(arr){ if(!arr || !arr.length) return null; return arr[rngInt(arr.length)]; }
export function weightedPick(weights){
  const total = weights.reduce((a,w)=>a+(w.weight ?? w.w ?? 0),0);
  let r = Math.random()*total;
  for(const w of weights){
    const val = w.weight ?? w.w ?? 0;
    if((r-=val) <= 0) return w.key ?? w.k ?? w;
  }
  return weights[0].key ?? weights[0];
}
