/* LaneLite local recommendation engine. Educational heuristics only: no win-rate claims. */

export const FALLBACK_CHAMPIONS = `Aatrox,Ahri,Akali,Akshan,Alistar,Amumu,Anivia,Annie,Aphelios,Ashe,Aurelion Sol,Aurora,Azir,Bard,Bel'Veth,Blitzcrank,Brand,Braum,Briar,Caitlyn,Camille,Cassiopeia,Cho'Gath,Corki,Darius,Diana,Dr. Mundo,Draven,Ekko,Elise,Evelynn,Ezreal,Fiddlesticks,Fiora,Fizz,Galio,Gangplank,Garen,Gnar,Gragas,Graves,Gwen,Hecarim,Heimerdinger,Hwei,Illaoi,Irelia,Ivern,Janna,Jarvan IV,Jax,Jayce,Jhin,Jinx,Kai'Sa,Kalista,Karma,Karthus,Kassadin,Katarina,Kayle,Kayn,Kennen,Kha'Zix,Kindred,Kled,Kog'Maw,LeBlanc,Lee Sin,Leona,Lillia,Lissandra,Lucian,Lulu,Lux,Malphite,Malzahar,Maokai,Master Yi,Mel,Miss Fortune,Mordekaiser,Morgana,Naafiri,Nami,Nasus,Nautilus,Neeko,Nidalee,Nilah,Nocturne,Nunu & Willump,Olaf,Orianna,Ornn,Pantheon,Poppy,Pyke,Qiyana,Quinn,Rakan,Rammus,Rek'Sai,Rell,Renata Glasc,Renekton,Rengar,Riven,Rumble,Ryze,Samira,Sejuani,Senna,Seraphine,Sett,Shaco,Shen,Shyvana,Singed,Sion,Sivir,Skarner,Smolder,Sona,Soraka,Swain,Sylas,Syndra,Tahm Kench,Taliyah,Talon,Taric,Teemo,Thresh,Tristana,Trundle,Tryndamere,Twisted Fate,Twitch,Udyr,Urgot,Varus,Vayne,Veigar,Vel'Koz,Vex,Vi,Viego,Viktor,Vladimir,Volibear,Warwick,Wukong,Xayah,Xerath,Xin Zhao,Yasuo,Yone,Yorick,Yuumi,Zac,Zed,Zeri,Ziggs,Zilean,Zoe,Zyra`.split(',');

const AP = new Set(`Ahri,Akali,Amumu,Anivia,Annie,Aurelion Sol,Aurora,Azir,Alistar,Brand,Cassiopeia,Cho'Gath,Diana,Ekko,Elise,Evelynn,Fiddlesticks,Fizz,Galio,Gragas,Gwen,Heimerdinger,Hwei,Ivern,Karthus,Kassadin,Katarina,Kennen,Lillia,Lissandra,Lulu,Lux,Malphite,Malzahar,Maokai,Mel,Mordekaiser,Morgana,Nami,Neeko,Nidalee,Nunu & Willump,Orianna,Rumble,Ryze,Seraphine,Singed,Swain,Syndra,Taliyah,Teemo,Veigar,Vel'Koz,Vex,Viktor,Vladimir,Volibear,Xerath,Zac,Ziggs,Zilean,Zoe,Zyra`.split(','));
const ADDITIONAL_MAGIC = new Set(`Leona,Nautilus,Ornn,Rammus,Rell,Sejuani,Shen,Tahm Kench,Thresh,Zac`.split(','));
const MIXED = new Set(`Warwick,Kayle,Kai'Sa,Jax,Kog'Maw,Udyr,Shyvana,Varus,Volibear`.split(','));
const TANKS = new Set(`Alistar,Amumu,Braum,Cho'Gath,Dr. Mundo,Galio,Gragas,K'Sante,Leona,Malphite,Maokai,Nautilus,Ornn,Poppy,Rammus,Rell,Sejuani,Shen,Sion,Skarner,Tahm Kench,Taric,Thresh,Zac`.split(','));
const HEALING = new Set(`Aatrox,Briar,Dr. Mundo,Fiora,Gwen,Illaoi,Irelia,Ivern,Kayn,Maokai,Mordekaiser,Nami,Nasus,Olaf,Renekton,Senna,Soraka,Swain,Sylas,Vladimir,Volibear,Warwick,Yuumi,Zac`.split(','));
const HARD_CC = new Set(`Alistar,Amumu,Anivia,Ashe,Bard,Blitzcrank,Braum,Galio,Gragas,Janna,Jarvan IV,Leona,Lissandra,Lulu,Lux,Malphite,Maokai,Malzahar,Morgana,Nami,Nautilus,Neeko,Ornn,Poppy,Rakan,Rammus,Rell,Sejuani,Seraphine,Skarner,Thresh,Veigar,Vi,Warwick,Wukong,Zac,Zyra`.split(','));
const RANGED = new Set(`Ahri,Akshan,Anivia,Annie,Aphelios,Ashe,Aurelion Sol,Aurora,Azir,Bard,Brand,Caitlyn,Cassiopeia,Corki,Draven,Ezreal,Graves,Heimerdinger,Hwei,Ivern,Janna,Jayce,Jhin,Jinx,Kai'Sa,Kalista,Karma,Karthus,Kayle,Kennen,Kindred,Kog'Maw,LeBlanc,Lissandra,Lucian,Lulu,Lux,Mel,Miss Fortune,Morgana,Nami,Neeko,Nidalee,Nilah,Orianna,Quinn,Renata Glasc,Rumble,Ryze,Senna,Seraphine,Sivir,Smolder,Sona,Soraka,Syndra,Taliyah,Teemo,Tristana,Twitch,Twisted Fate,Varus,Vayne,Veigar,Vel'Koz,Vex,Viktor,Xayah,Xerath,Zeri,Ziggs,Zilean,Zoe,Zyra`.split(','));
const BURST = new Set(`Ahri,Akali,Annie,Aurora,Diana,Ekko,Elise,Evelynn,Fizz,Katarina,Kha'Zix,LeBlanc,Lissandra,Lux,Naafiri,Neeko,Nocturne,Qiyana,Rengar,Syndra,Talon,Vex,Veigar,Zed,Zoe`.split(','));
const AUTOS = new Set(`Akshan,Aphelios,Ashe,Bel'Veth,Briar,Caitlyn,Draven,Fiora,Irelia,Jax,Jhin,Jinx,Kalista,Kayle,Kindred,Kog'Maw,Lucian,Master Yi,Nilah,Olaf,Quinn,Samira,Sett,Sivir,Tristana,Tryndamere,Twitch,Varus,Vayne,Warwick,Xayah,Yasuo,Yone,Zeri`.split(','));
const POKE = new Set(`Ashe,Brand,Caitlyn,Corki,Ezreal,Jayce,Jhin,Karma,Lux,Morgana,Orianna,Seraphine,Teemo,Varus,Vel'Koz,Xerath,Ziggs,Zoe,Zyra`.split(','));

export function traits(name) {
  return {
    ap: (AP.has(name) || ADDITIONAL_MAGIC.has(name)) && !MIXED.has(name), mixed: MIXED.has(name), tank: TANKS.has(name), healing: HEALING.has(name), cc: HARD_CC.has(name),
    ranged: RANGED.has(name), burst: BURST.has(name), autos: AUTOS.has(name), poke: POKE.has(name),
  };
}

export function analyzeTeam(enemies = []) {
  const names = enemies.filter(Boolean);
  const counts = { total: names.length, ap: 0, ad: 0, mixed: 0, tanks: 0, healing: 0, cc: 0, ranged: 0, burst: 0, autos: 0, poke: 0 };
  for (const name of names) {
    const t = traits(name);
    counts[t.mixed ? 'mixed' : t.ap ? 'ap' : 'ad']++;
    if (t.tank) counts.tanks++;
    if (t.healing) counts.healing++;
    if (t.cc) counts.cc++;
    if (t.ranged) counts.ranged++;
    if (t.burst) counts.burst++;
    if (t.autos) counts.autos++;
    if (t.poke) counts.poke++;
  }
  return counts;
}

const RUNE_PROFILES = {
  Briar: { primary: 'Press the Attack', secondary: 'Conqueror', mainWhy: 'Helps amplify damage on a focused target during repeated attacks.', altWhy: 'Consider for sustained skirmishes and durable frontlines.', path: 'Precision', note: 'Prioritize reliable access to targets; rune choices depend on role and build.' },
  Amumu: { primary: 'Aftershock', secondary: 'Conqueror', mainWhy: 'Defensive value after you commit with crowd control.', altWhy: 'A sustained-fight option when you can stay in combat.', path: 'Resolve', note: 'Tank and damage-oriented Amumu setups have different priorities.' },
  Sylas: { primary: 'Conqueror', secondary: 'Electrocute', mainWhy: 'Fits extended trading and repeated spell rotations.', altWhy: 'A burst-focused option for shorter trades.', path: 'Precision', note: 'Consider how safely you can reach the enemy before committing.' },
  Ivern: { primary: 'Summon Aery', secondary: 'Guardian', mainWhy: 'Adds value to frequent shielding and supportive play.', altWhy: 'A defensive choice when teammates need peel.', path: 'Sorcery', note: 'These are playstyle options, not patch-verified win-rate leaders.' },
  Akshan: { primary: 'Press the Attack', secondary: 'Fleet Footwork', mainWhy: 'Rewards repeated autos in favorable trades.', altWhy: 'Helps with sustain and movement into poke lanes.', path: 'Precision' },
  Warwick: { primary: 'Press the Attack', secondary: 'Conqueror', mainWhy: 'Works with repeated attacks and early duels.', altWhy: 'For longer fights into multiple bruisers.', path: 'Precision' },
  Lillia: { primary: 'Conqueror', secondary: 'Phase Rush', mainWhy: 'Supports extended fights where abilities repeatedly connect.', altWhy: 'Consider when kiting and escaping matter more.', path: 'Precision' },
  Mordekaiser: { primary: 'Conqueror', secondary: 'Grasp of the Undying', mainWhy: 'A prolonged melee-fight keystone.', altWhy: 'Situational trading choice into melee lanes.', path: 'Precision' },
  Orianna: { primary: 'Summon Aery', secondary: 'Phase Rush', mainWhy: 'Offers lane harassment and shield value.', altWhy: 'More movement during extended skirmishes.', path: 'Sorcery' },
  Rammus: { primary: 'Aftershock', secondary: 'Guardian', mainWhy: 'Good fit for hard engage with defensive scaling.', altWhy: 'A peel-oriented alternative.', path: 'Resolve' },
  Poppy: { primary: 'Grasp of the Undying', secondary: 'Aftershock', mainWhy: 'A melee trading option with durability.', altWhy: 'Consider for support or jungle engage builds.', path: 'Resolve' },
  Galio: { primary: 'Aftershock', secondary: 'Phase Rush', mainWhy: 'Supports defensive engage and crowd control.', altWhy: 'Helps reposition against some matchups.', path: 'Resolve' },
  Vayne: { primary: 'Lethal Tempo', secondary: 'Fleet Footwork', mainWhy: 'Supports prolonged on-hit damage.', altWhy: 'More forgiving into lane poke.', path: 'Precision' },
};

export function recommendRunes(champion, opponent) {
  const p = RUNE_PROFILES[champion];
  const enemy = traits(opponent);
  if (!champion) return { ready: false, title: 'Select your champion', body: 'Choose your pick to see an initial rune direction.' };
  if (!p) return { ready: false, title: 'Matchup runes not curated yet', body: `${champion} is supported in the team analyzer. A verified champion-specific rune profile still needs to be added.` };
  let context = !opponent ? 'Select your actual opponent to add lane-specific context.'
    : enemy.poke ? `${opponent} has poke pressure. Weigh sustain and safe access over greedier damage setups.`
    : enemy.burst ? `${opponent} has burst threat. Defensive secondary choices and short-trade discipline may matter.`
    : enemy.tank ? `${opponent} is a durable opponent. Extended-trade setups may be more appropriate.`
    : enemy.ranged ? `${opponent} is ranged. Consider how you'll survive the approach and control the wave.`
    : `${opponent} is a closer-range matchup. Think about whose extended trade is stronger.`;
  return { ready: true, title: p.primary, alternate: p.secondary, path: p.path, mainWhy: p.mainWhy, altWhy: p.altWhy, context, note: p.note || 'Provisional playstyle guide, not verified for the current patch.' };
}

export function matchupTips(champion, opponent) {
  if (!champion || !opponent) return [
    { title: 'No guessing', body: 'Choose your champion and the opponent you are actually facing.' },
    { title: 'Your decision', body: 'Recommendations are always optional and explained.' },
  ];
  const e = traits(opponent), you = traits(champion), tips = [];
  if (e.ranged && !you.ranged) tips.push({ title: 'Respect the approach', body: `${opponent} can threaten you from range. Preserve health until you have a real opening.` });
  if (e.burst) tips.push({ title: 'Track their burst window', body: 'Short trades may be dangerous when key enemy abilities are available.' });
  if (e.poke) tips.push({ title: 'Manage poke pressure', body: 'Favor safe farm and avoid taking repeated free hits for small trades.' });
  if (e.healing) tips.push({ title: 'Sustain matchup', body: 'Evaluate anti-heal later if healing actually becomes a problem; do not rush it blindly.' });
  if (e.tank) tips.push({ title: 'Longer fights', body: 'Consider sustained damage and whether you have enough time to finish the trade.' });
  if (you.ranged && !e.ranged) tips.push({ title: 'Range advantage', body: 'Harass when safe, but respect gap closers and gank setup.' });
  if (tips.length < 2) tips.push({ title: 'Cooldown discipline', body: 'Trade when their important ability is unavailable, not just because they are in range.' });
  return tips.slice(0, 3);
}

export function itemSuggestions(enemies = []) {
  const c = analyzeTeam(enemies), out = [];
  if (!c.total) return [{ title: 'Fill in the enemy team', body: 'Add known enemies to see composition-based options.', kind: 'pending' }];
  if (c.ap >= 3) out.push({ title: 'Magic resistance', body: `${c.ap} of ${c.total} enemies look primarily magic-oriented. Consider MR items appropriate to your champion.`, kind: 'defense' });
  if (c.ad >= 3) out.push({ title: 'Armor', body: `${c.ad} of ${c.total} enemies look primarily physical-oriented. Armor may have strong value.`, kind: 'defense' });
  if (c.healing >= 2) out.push({ title: 'Anti-heal option', body: `${c.healing} opponents have notable sustain in their kits. Think about anti-heal if the match calls for it.`, kind: 'response' });
  if (c.cc >= 3) out.push({ title: 'CC mitigation', body: `${c.cc} enemies have important crowd control. Tenacity or relevant defensive actives might help, depending on CC type.`, kind: 'response' });
  if (c.tanks >= 2) out.push({ title: 'Sustained / anti-tank damage', body: `${c.tanks} tanky opponents identified. Value percent-health, penetration, or long-fight tools where suitable.`, kind: 'offense' });
  if (c.autos >= 3) out.push({ title: 'Anti-auto-attack defense', body: 'Several opponents rely on repeated basic attacks. Armor or attack-speed mitigation may be valuable.', kind: 'defense' });
  if (c.poke >= 2) out.push({ title: 'Poke resilience', body: 'Multiple ranged poke threats may reward sustain, shielding or reliable engage.', kind: 'response' });
  if (!out.length) out.push({ title: 'Balanced response', body: 'No single damage or utility category dominates so far. Build for the actual threats that emerge.', kind: 'response' });
  return out.slice(0, 5);
}

const PICKS_BY_ROLE = {
  Jungle: { ad: ['Rammus', 'Amumu'], ap: ['Ivern', 'Jarvan IV'], tank: ['Lillia', 'Brand'], cc: ['Olaf', 'Ivern'], fallback: ['Amumu', 'Briar'] },
  Top: { ad: ['Malphite', 'Rammus'], ap: ['Galio', 'Dr. Mundo'], tank: ['Gwen', 'Fiora'], cc: ['Olaf', 'Gwen'], fallback: ['Poppy', 'Ornn'] },
  Mid: { ad: ['Galio', 'Lissandra'], ap: ['Galio', 'Kassadin'], tank: ['Aurelion Sol', 'Cassiopeia'], cc: ['Morgana', 'Sivir'], fallback: ['Orianna', 'Ahri'] },
  Bot: { ad: ['Nilah', 'Vayne'], ap: ['Sivir', 'Ezreal'], tank: ['Vayne', 'Kog\'Maw'], cc: ['Sivir', 'Ezreal'], fallback: ['Ashe', 'Jinx'] },
  Support: { ad: ['Braum', 'Taric'], ap: ['Galio', 'Karma'], tank: ['Brand', 'Zyra'], cc: ['Morgana', 'Milio'], fallback: ['Janna', 'Nautilus'] },
};
export function compositionIdeas(enemies = [], role = 'Jungle') {
  const c = analyzeTeam(enemies), pool = PICKS_BY_ROLE[role] || PICKS_BY_ROLE.Jungle;
  if (c.total < 2) return [];
  let key = 'fallback', reason = 'Flexible picks that offer useful team utility.';
  if (c.tanks >= 2) { key = 'tank'; reason = 'Multiple frontliners suggest looking at sustained damage or anti-tank kits.'; }
  else if (c.ad >= 3) { key = 'ad'; reason = 'A physical-heavy team may be vulnerable to armor-focused champions.'; }
  else if (c.ap >= 3) { key = 'ap'; reason = 'Magic-heavy opponents reward certain defensive and anti-magic kits.'; }
  else if (c.cc >= 3) { key = 'cc'; reason = 'Heavy crowd control can be answered with protection or self-sufficiency.'; }
  return [...new Set(pool[key])].slice(0, 2).map(name => ({ name, reason }));
}

export function lpDelta(before, after) {
  const a = Number(before), b = Number(after);
  if (!Number.isFinite(a) || !Number.isFinite(b) || String(before).trim() === '' || String(after).trim() === '') return null;
  return b - a;
}

export function normalizeChampions(apiData) {
  if (!apiData || typeof apiData !== 'object') return [];
  return Object.values(apiData).filter(v => v && typeof v.name === 'string').map(v => ({ name: v.name, id: v.id, key: Number(v.key) })).sort((a, b) => a.name.localeCompare(b.name));
}

export function championNames(champions) { return champions.map(c => c.name); }
