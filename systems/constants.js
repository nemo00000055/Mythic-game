// systems/constants.js
export const ITEM_TYPES = ["weapon","armor","trinket","boots","headgear","hands"];

export const RARITIES = [
  { key:"normal",    label:"Normal",    atk:2,  def:1,  hp:6,   price:20,  weight:0.40 },
  { key:"common",    label:"Common",    atk:3,  def:2,  hp:10,  price:40,  weight:0.30 },
  { key:"rare",      label:"Rare",      atk:6,  def:4,  hp:20,  price:90,  weight:0.18, affix:true },
  { key:"epic",      label:"Epic",      atk:10, def:7,  hp:35,  price:180, weight:0.085, affix:true },
  { key:"legendary", label:"Legendary", atk:16, def:11, hp:60,  price:400, weight:0.03,  affix:true },
  { key:"mythical",  label:"Mythical",  atk:22, def:16, hp:90,  price:700, weight:0.004, affix:true },
  { key:"world",     label:"World Item",atk:30, def:22, hp:140, price:1400,weight:0.001, affix:true }
];

// Rarity order helper for sorting (lower index == lower rarity)
const rarityIndex = new Map(RARITIES.map((r,i)=>[r.key,i]));
export function rarityOrder(key){ return rarityIndex.get(key) ?? 0; }

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

// Theme rotation: every 30 waves advance, cycle indefinitely
export const THEME_ROTATION = ["Draconic","Undead","Warrior","Nature","Elemental","Abyss","Giant","Frost","Demonic","Holy","Arcane","Rogue","Tech"];

// Per-name themes
export const HERO_THEME = {
  Barbarian:"Warrior", Human:"Warrior", Elf:"Nature", Knight:"Holy", Samurai:"Warrior", Viking:"Warrior",
  Wizard:"Arcane", Paladin:"Holy", Assassin:"Rogue", Ranger:"Nature", Necromancer:"Undead", Monk:"Holy",
  Druid:"Nature", Berserker:"Warrior", Priest:"Holy", Alchemist:"Tech", Bard:"Arcane", Warlock:"Abyss",
  Templar:"Holy", Hunter:"Nature", Gladiator:"Warrior", Gunblade:"Tech", Engineer:"Tech", Sentinel:"Holy",
  Shadowmage:"Rogue"
};

export const CREATURE_THEME = {
  Dragon:"Draconic", Vampire:"Undead", Griffin:"Beast", Hydra:"Beast", Werewolf:"Beast", Minotaur:"Giant",
  Kraken:"Elemental", Cyclops:"Giant", Phoenix:"Elemental", Gorgon:"Abyss", Manticore:"Beast",
  Banshee:"Undead", Lich:"Undead", Leviathan:"Elemental", Wendigo:"Frost", Chimera:"Beast", Harpy:"Beast",
  Basilisk:"Abyss", Naga:"Abyss", Djinn:"Arcane", Oni:"Demonic", Yeti:"Frost", Dryad:"Nature",
  Ghoul:"Undead", Titan:"Giant"
};
