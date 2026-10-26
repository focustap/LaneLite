// LaneLite v0.3 — curated patch 16.20 baseline item/rune paths; not a live-stat feed.
// Data Dragon supplies icons / currently valid item names, not matchup win rates.
import { analyzeTeam } from './logic.mjs';
export const REFERENCE_PATCH = '16.20';
export const REFERENCE_DATE = '2026-10-13';

const paths = {
  Briar: {
    role:'Jungle', skill:'W → Q → E',
    runes:{primary:'Precision', main:['Press the Attack','Triumph','Legend: Alacrity','Coup de Grace'], secondary:'Domination', minor:['Sudden Impact','Treasure Hunter'], shards:['Adaptive Force','Adaptive Force','Health Scaling']},
    base:['The Collector','Plated Steelcaps','Titanic Hydra',"Lord Dominik's Regards","Death's Dance",'Guardian Angel'],
    alternate:['Blade of The Ruined King','Plated Steelcaps','Black Cleaver',"Death's Dance",'Spirit Visage','Guardian Angel'],
    alternateReason:'Bruiser path: consider for prolonged fights against multiple frontliners.',
    source:'https://mobalytics.gg/lol/champions/briar/build/jungle',
    note:'A recent ranked reference path, not a promise of highest win rate into a specific draft.'
  },
  Amumu: {
    role:'Jungle', skill:'E → Q → W',
    runes:{primary:'Precision', main:['Conqueror','Triumph','Legend: Haste','Last Stand'],secondary:'Domination',minor:['Cheap Shot','Ultimate Hunter'],shards:['Ability Haste','Health Scaling','Health Scaling']},
    base:["Liandry's Torment",'Plated Steelcaps','Sunfire Aegis','Abyssal Mask','Thornmail','Jak\'Sho, The Protean'],
    source:'https://mobalytics.gg/lol/champions/amumu/build/jungle',
    note:'The sixth item is a flexible tank completion rather than a source-verified slot.'
  },
  Lillia: {
    role:'Jungle', skill:'Q → W → E',
    runes:{primary:'Precision',main:['Conqueror','Triumph','Legend: Haste','Coup de Grace'],secondary:'Inspiration',minor:['Magical Footwear','Cosmic Insight'],shards:['Ability Haste','Move Speed','Health Scaling']},
    base:["Liandry's Torment","Sorcerer's Shoes",'Riftmaker',"Zhonya's Hourglass","Rylai's Crystal Scepter",'Rabadon\'s Deathcap'],
    source:'https://mobalytics.gg/lol/champions/lillia/build/jungle',
    note:'The sixth item is a flexible completion rather than a source-verified slot.'
  },
  Warwick: {
    role:'Jungle', skill:'W → Q → E',
    runes:{primary:'Precision',main:['Lethal Tempo','Triumph','Legend: Alacrity','Last Stand'],secondary:'Sorcery',minor:['Celerity','Waterwalking'],shards:['Attack Speed','Adaptive Force','Health Scaling']},
    base:['Stridebreaker','Plated Steelcaps','Blade of The Ruined King',"Death's Dance",'Spirit Visage','Guardian Angel'],
    source:'https://mobalytics.gg/lol/champions/warwick/build/jungle',
    note:'The sixth item is a flexible defensive completion rather than a source-verified slot.'
  },
  Sylas: {
    role:'Mid', skill:'W → E → Q',
    runes:{primary:'Precision',main:['Conqueror','Presence of Mind','Legend: Haste','Last Stand'],secondary:'Resolve',minor:['Second Wind','Unflinching'],shards:['Adaptive Force','Move Speed','Health Scaling']},
    base:['Hextech Rocketbelt','Ionian Boots of Lucidity','Riftmaker',"Zhonya's Hourglass","Rabadon's Deathcap",'Void Staff'],
    source:'https://mobalytics.gg/lol/champions/sylas/build/mid',
    note:'The sixth item is a flexible magic penetration completion rather than a source-verified slot.'
  }
};

function swap(items, oldItem, newItem, reasons, text) {
  const at=items.indexOf(oldItem);
  if(at<0 || items.includes(newItem)) return;
  items[at]=newItem;
  reasons.push({ item:newItem, insteadOf:oldItem, why:text });
}

/** Returns a full six-slot item path when a supported champion and role are selected.
 * The final conditional swaps are transparent LaneLite heuristics, not mined matchup stats.
 */
export function getBuildPlan(champion, role='Jungle', enemies=[]) {
  const profile=paths[champion];
  if(!profile || profile.role!==role) return null;
  const c=analyzeTeam(enemies);
  const isBriarFrontline=champion==='Briar' && c.tanks>=2;
  const items=[...(isBriarFrontline ? profile.alternate : profile.base)];
  const reasons=[];
  if(isBriarFrontline) reasons.push({item:'Black Cleaver',insteadOf:'The Collector route',why:`${c.tanks} durable enemies identified: a bruiser route offers longer-fight options. It isn't proven optimal against this exact five.`});
  const armorBoots=['Plated Steelcaps','Sorcerer\'s Shoes','Ionian Boots of Lucidity'];
  if(c.ap>=3 || c.cc>=3) {
    const old=items.find(x=>armorBoots.includes(x));
    if(old) swap(items,old,"Mercury's Treads",reasons, c.ap>=3 ? `${c.ap} magic-oriented enemies: magic resist can be useful.` : `${c.cc} opponents with CC: tenacity helps against some CC, but not knockups or suppression.`);
  }
  if(champion==='Briar') {
    if(c.ap>=3) swap(items,"Death's Dance",'Spirit Visage',reasons,'More magic damage to absorb, and the healing synergy can help Briar survive.');
    if(c.healing>=2 && !isBriarFrontline) swap(items,"Lord Dominik's Regards",'Mortal Reminder',reasons,`${c.healing} sustain threats: Mortal Reminder adds Grievous Wounds instead of buying two Last Whisper upgrades.`);
  }
  if(champion==='Amumu') {
    if(c.ap>=3) {
      swap(items,'Sunfire Aegis','Hollow Radiance',reasons,'More magic-oriented enemies: magic resist from Hollow Radiance instead of armor from Sunfire.');
      swap(items,'Thornmail','Kaenic Rookern',reasons,'Magic-heavy drafts may reward additional MR more than Thornmail.');
    }
  }
  if(champion==='Lillia' && c.ap>=3) swap(items,"Zhonya's Hourglass","Banshee's Veil",reasons,'Versus magic threats, MR and the spell shield may fit better than armor and stasis.');
  if(champion==='Warwick' && c.ap>=3) swap(items,"Death's Dance",'Kaenic Rookern',reasons,'Magic-heavy teams make a dedicated MR item more attractive than an armor item.');
  if(champion==='Sylas' && c.ap>=3) swap(items,"Zhonya's Hourglass","Banshee's Veil",reasons,'MR and a spell shield are alternatives to an armor/stasis slot against magic-heavy drafts.');
  return { champion, role, items, runes:profile.runes, skill:profile.skill, source:profile.source,
    patch:REFERENCE_PATCH, date:REFERENCE_DATE, reasons, alternate: !isBriarFrontline ? profile.alternate : profile.base,
    alternateReason:profile.alternateReason || null, note:profile.note, basedOn:c.total, totalEnemies:c.total };
}

export function getBuildCoverage() { return Object.keys(paths); }

/** Extract usable item ids from the public Riot Data Dragon item catalog. No player stats. */
export function mapItemCatalog(apiData) {
  if(!apiData || typeof apiData!=='object') return {};
  return Object.fromEntries(Object.entries(apiData).filter(([id,item])=> /^\d+$/.test(id) && item?.name)
    .map(([id,item])=>[item.name,{id, name:item.name, gold:item.gold?.total??0, image:item.image?.full||`${id}.png`} ]));
}

export function mapRuneCatalog(trees) {
  if(!Array.isArray(trees)) return {};
  const out={};
  for(const tree of trees) for(const slot of (tree.slots||[])) for(const rune of (slot.runes||[]))
    if(typeof rune.name==='string' && typeof rune.icon==='string') out[rune.name]=rune.icon;
  return out;
}
