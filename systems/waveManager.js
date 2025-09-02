// systems/waveManager.js
import { themeForWave, nameTheme, difficultyForWave } from "./themeManager.js";
import { pick } from "./rng.js";

export function rollWaveEnemies(wave, playerSide, baseList){
  const theme = themeForWave(wave);
  const poolThemed = baseList.filter(n => nameTheme(n, playerSide) === theme);
  const pool = poolThemed.length ? poolThemed : baseList;
  const { isBoss, isElite, isSuper, scaled } = difficultyForWave(wave);
  const baseCount = Math.min(8, 2 + Math.floor(wave/3));
  let count = baseCount + (isElite ? 1 : 0) + (isBoss ? 0 : 0) + (isSuper ? 2 : 0);
  const enemies = [];
  for(let i=0;i<count;i++){
    enemies.push(pick(pool));
  }
  return { enemies, flags:{ isBoss, isElite, isSuper, diff:scaled, theme } };
}
