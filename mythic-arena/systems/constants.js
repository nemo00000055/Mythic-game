// Minimal data needed for the selection screen.
// If your project already defines these (with themes & rotations), keep your existing ones.

export const HEROES = [
  "Barbarian","Human","Elf","Knight","Samurai","Viking","Wizard","Paladin","Assassin","Ranger",
  "Necromancer","Monk","Druid","Berserker","Priest","Alchemist","Bard","Warlock","Templar","Hunter",
  "Gladiator","Gunblade","Engineer","Sentinel","Shadowmage"
];

export const CREATURES = [
  "Dragon","Vampire","Griffin","Hydra","Werewolf","Minotaur","Kraken","Cyclops","Phoenix","Gorgon",
  "Manticore","Banshee","Lich","Leviathan","Wendigo","Chimera","Harpy","Basilisk","Naga","Djinn",
  "Oni","Yeti","Dryad","Ghoul","Titan"
];

// Replace with your real theme grouping if you already have it.
const THEMES = {
  Undead: ["Vampire","Banshee","Lich","Ghoul"],
  Draconic: ["Dragon","Hydra","Leviathan"],
  Beast: ["Griffin","Werewolf","Minotaur","Manticore","Wendigo","Harpy","Basilisk","Yeti"],
  Nature: ["Dryad","Naga"],
  Elemental: ["Phoenix","Kraken","Djinn"],
  Giant: ["Cyclops","Titan"],
  Holy: ["Paladin","Templar","Priest"],
  Arcane: ["Wizard","Warlock","Alchemist","Bard","Necromancer","Shadowmage"],
  Rogue: ["Assassin","Ranger","Hunter","Gladiator","Gunblade"],
  Warrior: ["Barbarian","Knight","Samurai","Viking","Monk","Berserker","Sentinel","Engineer","Human","Elf","Druid"]
};

export function groupHeroesByTheme() {
  const map = {};
  for (const [theme, names] of Object.entries(THEMES)) {
    const only = names.filter(n => HEROES.includes(n));
    if (only.length) map[theme] = only;
  }
  return map;
}
export function groupCreaturesByTheme() {
  const map = {};
  for (const [theme, names] of Object.entries(THEMES)) {
    const only = names.filter(n => CREATURES.includes(n));
    if (only.length) map[theme] = only;
  }
  return map;
}
