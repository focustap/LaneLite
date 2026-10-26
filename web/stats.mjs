// Small, dated references read from public LoLalytics counter pages. No private API.
// Fields: opponent, champion's raw match WR, normalized delta 2 (percentage points), games.
const reference = (champion, role, patch, rows) => ({ champion, role, patch,
  tier: 'Emerald+', region: 'Global', queue: 'Solo/Duo', checked: '2026-10-26',
  source: `https://lolalytics.com/lol/${champion.toLowerCase()}/counters/${role === 'Mid' ? '?lane=middle' : ''}`,
  rows: rows.map(([opponent, winRate, delta, games]) => ({opponent, winRate, delta, games})) });

export const COUNTER_REFERENCES = [
  reference('Briar','Jungle','16.21',[
    ["Rek'Sai",45.57,-6.77,237],['Zac',47.91,-4.04,526],['Ambessa',48.11,-8.86,106],
    ['Trundle',48.20,-5.14,139],['Rammus',48.60,-2.33,465],['Skarner',48.68,-3.81,189],
    ['Warwick',51.92,0.47,834],['Lillia',52.26,0.64,1217],['Naafiri',58.26,4.30,575],['Nunu & Willump',60.24,7.48,503]
  ]),
  reference('Amumu','Jungle','16.20',[
    ['Olaf',37.06,-15.78,143],['Mordekaiser',47.93,-3.97,121],['Ivern',47.99,-3.01,273],
    ['Sylas',48.26,-5.23,2122],['Talon',48.62,-3.84,1380],['Zed',48.71,-6.38,700]
  ]),
  reference('Lillia','Jungle','16.21',[
    ['Rengar',46.90,-8.19,968],['Fizz',47.59,-5.17,187],['Taliyah',47.68,-4.99,581],
    ['Evelynn',48.61,-4.38,718],["Rek'Sai",49.06,-3.39,426],['Gwen',50.22,-2.36,223],['Jax',65.24,11.21,233]
  ]),
  reference('Warwick','Jungle','16.20',[
    ['Sion',48.39,-4.27,124],['Maokai',49.45,-3.64,182],["Rek'Sai",49.70,-2.96,501],
    ["Cho'Gath",49.70,-2.40,2857],['Brand',50,-6.61,110],['Trundle',50.43,-2.66,351]
  ]),
  reference('Sylas','Mid','16.20',[
    ['Heimerdinger',37.14,-8.78,175],['Gwen',40.09,-6.71,227],['Kennen',40.87,-6.04,115],
    ['Vex',43.45,-3.88,1199],['Swain',44.73,-3.96,503],["Cho'Gath",45.36,-5.24,280]
  ])
];

export const getCounterReference = (champion, role) => COUNTER_REFERENCES.find(r => r.champion === champion && r.role === role) || null;
export const sourceSlug = champion => ({'Nunu & Willump':'nunu', 'Renata Glasc':'renata', 'Wukong':'wukong'}[champion] || String(champion).toLowerCase().replace(/[^a-z0-9]/g,''));
export function lolalyticsLinks(champion, role, opponent='') {
  if (!champion) return null;
  const lane = {Jungle:'jungle',Top:'top',Mid:'middle',Bot:'bottom',Support:'support'}[role] || 'jungle';
  const base = `https://lolalytics.com/lol/${sourceSlug(champion)}`;
  const params = new URLSearchParams({lane});
  return {build:`${base}/build/?${params}`, counters:`${base}/counters/?${params}`,
    matchup:opponent ? `${base}/vs/${sourceSlug(opponent)}/build/?${params}` : null};
}
export function referenceRows(champion, role, opponents=[], minGames=100) {
  const ref = getCounterReference(champion, role);
  if (!ref) return [];
  const wanted = new Set(opponents);
  return ref.rows.filter(r => r.games >= minGames)
    .map(r => ({...r, selected:wanted.has(r.opponent)}))
    .sort((a,b) => Number(b.selected)-Number(a.selected) || a.delta-b.delta);
}

/** Descriptive personal sample only. Never infer population synergy from these games. */
export function summarizePersonal(matches, championId, role='All', queue='all') {
  const seen = new Set();
  const games = (Array.isArray(matches) ? matches : []).filter(m => {
    if (!m || !m.id || seen.has(m.id) || m.championId !== Number(championId) || typeof m.win !== 'boolean' ||
      ![420,440].includes(m.queueId) || !Number.isFinite(m.duration) || m.duration < 300 ||
      (role !== 'All' && m.role !== role) || (queue !== 'all' && m.queueId !== Number(queue))) return false;
    seen.add(m.id); return true;
  });
  const wins = games.filter(m => m.win).length;
  const winRate = games.length ? 100*wins/games.length : null;
  const countSide = side => {
    const result = new Map();
    for (const m of games) for (const id of new Set(m[side] || [])) {
      if (!Number.isInteger(id) || id <= 0 || (side === 'allies' && id === Number(championId))) continue;
      const r = result.get(id) || {championId:id,games:0,wins:0};
      r.games++; r.wins += Number(m.win); result.set(id,r);
    }
    return [...result.values()].map(r => ({...r,winRate:100*r.wins/r.games,
      delta:100*r.wins/r.games-winRate, smallSample:r.games < 20}))
      .sort((a,b) => b.games-a.games || b.winRate-a.winRate);
  };
  return {games:games.length,wins,losses:games.length-wins,winRate,
    allies:countSide('allies'),enemies:countSide('enemies')};
}

export function nextPollDelay(snapshot) {
  if (!snapshot?.connected) return 15000;
  if (snapshot.phase === 'ChampSelect') return 2500;
  if (['WaitingForStats','EndOfGame','PreEndOfGame'].includes(snapshot.phase)) return 4000;
  if (['InProgress','GameStart','Reconnect'].includes(snapshot.phase)) return 20000;
  return 10000;
}
