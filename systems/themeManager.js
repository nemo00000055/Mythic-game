import { THEME_ROTATION, HERO_THEME, CREATURE_THEME } from "./constants.js";

export function themeForWave(n){
  const block = Math.floor((n - 1) / 30);
  return THEME_ROTATION[ block % THEME_ROTATION.length ];
}

export function nameTheme(name, side){
  // side: 'hero' | 'creature'
  const map = side === 'hero' ? HERO_THEME : CREATURE_THEME;
  return map[name] || "Warrior";
}

export function groupByTheme(list, side){
  const result = {};
  for (const name of (list || [])) {
    const t = nameTheme(name, side);
    if (!result[t]) result[t] = [];
    result[t].push(name);
  }
  if (Object.keys(result).length === 0) {
    result.Misc = [...(list || [])];
  }
  return result;
}

export function difficultyForWave(n){
  const base = 1 + (n - 1) * 0.08;
  const isBoss  = (n % 5  === 0);
  const isElite = (n % 10 === 0);
  const isSuper = (n % 30 === 0);
  let mult = 1;
  if (isBoss)  mult *= 1.5;
  if (isElite) mult *= 1.2;
  if (isSuper) mult *= 2.0;
  return { base, isBoss, isElite, isSuper, mult, scaled: base * mult };
}

export function previewWaveText({ enemyList } = {}){
  const list = enemyList || [];
  if (!list.length) return "—";
  const counts = new Map();
  for (const n of list) counts.set(n, (counts.get(n) || 0) + 1);
  const parts = [...counts.entries()]
    .sort((a,b)=> (b[1]-a[1]) || a[0].localeCompare(b[0]))
    .map(([name,c]) => `${c}x ${name}`);
  return parts.join(", ");
}
