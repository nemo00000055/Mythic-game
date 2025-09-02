// systems/constants.js
export const ITEM_TYPES = ["weapon","armor","trinket","boots","headgear","hands"];

export const RARITIES = [
  { key:"Normal",    atk:2,  def:1,  hp:6,   price:20,  weight:0.40 },
  { key:"Common",    atk:3,  def:2,  hp:10,  price:40,  weight:0.30 },
  { key:"Rare",      atk:6,  def:4,  hp:20,  price:90,  weight:0.18, affix:true },
  { key:"Epic",      atk:10, def:7,  hp:35,  price:180, weight:0.085, affix:true },
  { key:"Legendary", atk:16, def:11, hp:60,  price:400, weight:0.03,  affix:true },
  { key:"Mythical",  atk:22, def:16, hp:90,  price:700, weight:0.004, affix:true },
  { key:"World",     atk:30, def:22, hp:140, price:1400,weight:0.001, affix:true }
];

export const SETS = {
  Vampire: { two:{ lifesteal:+10 }, four:{ lifesteal:+25 } },
  Dragon:  { two:{ atk:+8 },        four:{ atk:+14, specialCD:-1 } },
  Knight:  { two:{ def:+10 },       four:{ def:+20, dmgTakenMul:0.9 } },
  Arcane:  { two:{ atk:+10 },       four:{ atk:+20 } },
  Nature:  { two:{ hp:+20 },        four:{ hp:+50 } },
  Fortune: { two:{ gold:+12 },      four:{ gold:+25 } },
};

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

// Theme maps
export const THEMES = ["Warrior","Undead","Draconic","Nature","Holy","Arcane","Rogue","Beast","Giant","Frost","Demonic","Tech","Elemental","Abyss"];
export const THEME_ROTATION = ["Draconic","Undead","Warrior","Nature","Arcane","Beast","Holy","Frost","Giant","Demonic","Tech","Elemental","Abyss"];

export const HERO_THEME = {
  Barbarian:"Warrior", Human:"Warrior", Elf:"Nature", Knight:"Holy", Samurai:"Warrior", Viking:"Warrior",
  Wizard:"Arcane", Paladin:"Holy", Assassin:"Rogue", Ranger:"Nature", Necromancer:"Undead", Monk:"Holy",
  Druid:"Nature", Berserker:"Warrior", Priest:"Holy", Alchemist:"Tech", Bard:"Arcane", Warlock:"Abyss",
  Templar:"Holy", Hunter:"Beast", Gladiator:"Warrior", Gunblade:"Tech", Engineer:"Tech", Sentinel:"Holy",
  Shadowmage:"Rogue"
};

export const CREATURE_THEME = {
  Dragon:"Draconic", Vampire:"Undead", Griffin:"Beast", Hydra:"Draconic", Werewolf:"Beast", Minotaur:"Giant",
  Kraken:"Elemental", Cyclops:"Giant", Phoenix:"Elemental", Gorgon:"Abyss", Manticore:"Beast", Banshee:"Undead",
  Lich:"Undead", Leviathan:"Elemental", Wendigo:"Frost", Chimera:"Beast", Harpy:"Beast", Basilisk:"Abyss",
  Naga:"Elemental", Djinn:"Elemental", Oni:"Demonic", Yeti:"Frost", Dryad:"Nature", Ghoul:"Undead", Titan:"Giant"
};

export const CLASS_TRAITS = {
  Barbarian: { atk:+8, hp:+20, lifesteal:+3, special:{ name:"Rage Slam", cd:4, mult:1.6, flatHeal:0 } },
  Human: { atk:+5, def:+5, gold:+5, special:{ name:"Valor Strike", cd:4, mult:1.4, flatHeal:0 } },
  Knight: { def:+12, hp:+10, special:{ name:"Shield Bash", cd:4, mult:1.4, flatHeal:5 } },
  Samurai: { atk:+10, special:{ name:"Iaido Cut", cd:4, mult:1.7 } },
  Viking: { atk:+9, lifesteal:+4, special:{ name:"Berserk Howl", cd:4, mult:1.5 } },
  Wizard: { atk:+8, special:{ name:"Arcane Nova", cd:4, mult:1.9 } },
  Paladin: { def:+8, hp:+15, special:{ name:"Smite", cd:4, mult:1.5, flatHeal:8 } },
  Assassin: { atk:+11, special:{ name:"Shadow Strike", cd:3, mult:1.9 } },
  Ranger: { atk:+8, special:{ name:"Multishot", cd:4, mult:1.5, bonusKills:1 } },
  Necromancer: { def:+5, lifesteal:+6, special:{ name:"Soul Drain", cd:4, mult:1.6, flatHeal:6 } },
  Monk: { def:+8, hp:+10, special:{ name:"Palm Flurry", cd:4, mult:1.5 } },
  Druid: { hp:+20, special:{ name:"Nature Surge", cd:4, mult:1.4, flatHeal:10 } },
  Berserker: { atk:+12, hp:+10, special:{ name:"Mania Cleave", cd:4, mult:1.8 } },
  Priest: { def:+6, hp:+15, special:{ name:"Holy Light", cd:4, mult:1.2, flatHeal:15 } },
  Alchemist: { atk:+6, gold:+10, special:{ name:"Acid Flask", cd:4, mult:1.5 } },
  Bard: { def:+5, gold:+8, special:{ name:"Inspiring Anthem", cd:4, mult:1.3, flatHeal:6 } },
  Warlock: { atk:+9, lifesteal:+5, special:{ name:"Hexburst", cd:4, mult:1.7 } },
  Templar: { def:+10, special:{ name:"Edict", cd:4, mult:1.4 } },
  Hunter: { atk:+9, special:{ name:"Kill Shot", cd:4, mult:1.7 } },
  Gladiator: { atk:+8, def:+6, special:{ name:"Arena Sweep", cd:4, mult:1.6 } },
  Gunblade: { atk:+10, special:{ name:"Bullet Storm", cd:4, mult:1.6 } },
  Engineer: { def:+6, gold:+6, special:{ name:"Turret Volley", cd:4, mult:1.5 } },
  Sentinel: { def:+10, special:{ name:"Aegis Crush", cd:4, mult:1.4 } },
  Shadowmage: { atk:+9, special:{ name:"Umbral Lance", cd:4, mult:1.8 } },

  Dragon: { atk:+14, hp:+20, special:{ name:"Breath of Fire", cd:3, mult:2.0 } },
  Vampire:{ atk:+10, lifesteal:+12, special:{ name:"Night Feast", cd:3, mult:1.7, flatHeal:10 } },
  Titan:  { def:+14, hp:+25, special:{ name:"Colossus Smash", cd:4, mult:1.8 } },
  Lich:   { atk:+12, def:+6, special:{ name:"Necrotic Pulse", cd:4, mult:1.8 } },
};

export const DEFAULT_TRAIT = { atk:+6, def:+4, hp:+10, lifesteal:+2, gold:+0, special:{ name:"Power Move", cd:4, mult:1.5 } };
