import { FALLBACK_CHAMPIONS, analyzeTeam, itemSuggestions, matchupTips, recommendRunes, compositionIdeas, normalizeChampions } from './logic.mjs';
import { tickJournal, defaultJournal, rankText } from './tracker.mjs';
import { getBuildPlan, mapItemCatalog, mapRuneCatalog, REFERENCE_PATCH } from './builds.mjs';

const el = id => document.getElementById(id);
const esc = input => String(input ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const journalKey = 'lanelite.auto.v2';
const championCacheKey = 'lanelite.champions.v2';
const isDesktop = typeof window.__TAURI__?.core?.invoke === 'function';
const nativeInvoke = window.__TAURI__?.core?.invoke;
const stateKey = 'lanelite.select.v1';
const safelyRead = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
const safelySave = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
let journal = safelyRead(journalKey, defaultJournal());
if (!journal || !Array.isArray(journal.records)) journal = defaultJournal();
let live = null;
let simulated = false;
let dataVersion = '';
let itemCatalog = {};
let runeCatalog = {};
let lastPhase = null;
let inFlight = false;
let champions = safelyRead(championCacheKey, FALLBACK_CHAMPIONS.map(name => ({ name, id: null, key: null })));
if (!Array.isArray(champions) || !champions.length) champions = FALLBACK_CHAMPIONS.map(name => ({ name, id: null, key: null }));
let championSet = new Set(FALLBACK_CHAMPIONS);
let currentTab = 'team';
let selection = safelyRead(stateKey, { champion: '', opponent: '', role: 'Jungle', enemies: ['', '', '', '', ''] });
if (!selection || typeof selection !== 'object') selection = { champion: '', opponent: '', role: 'Jungle', enemies: ['', '', '', '', ''] };
if (!Array.isArray(selection.enemies) || selection.enemies.length !== 5) selection.enemies = ['', '', '', '', ''];
if (!Array.isArray(selection.enemyManual) || selection.enemyManual.length !== 5) selection.enemyManual = [false,false,false,false,false];

function canonicalize(input) {
  const str = String(input || '').trim().toLowerCase();
  if (!str) return '';
  const found = champions.find(c => c.name.toLowerCase() === str);
  return found?.name || '';
}
function selectedEnemies() { return [...new Set(selection.enemies.map(canonicalize).filter(Boolean))]; }
function chosenChampion() { return canonicalize(selection.champion); }
function chosenOpponent() { return canonicalize(selection.opponent); }
function persist() { safelySave(stateKey, selection); }
function createEnemyInputs() {
  el('team-inputs').innerHTML = Array.from({ length: 5 }, (_, i) => `<div class="enemy-input"><span class="enemy-number">0${i+1}</span><input aria-label="Enemy champion ${i+1}" data-enemy="${i}" list="champion-list" placeholder="Enemy champion…" autocomplete="off" value="${esc(selection.enemies[i])}" /></div>`).join('');
  document.querySelectorAll('[data-enemy]').forEach(input => {
    input.addEventListener('input', () => { selection.enemies[Number(input.dataset.enemy)] = input.value; selection.enemyManual[Number(input.dataset.enemy)] = true; persist(); refresh(); });
  });
}
function populateDatalist() {
  el('champion-list').innerHTML = champions.map(c => `<option value="${esc(c.name)}"></option>`).join('');
  championSet = new Set(champions.map(c=>c.name));
}
async function loadChampionCatalog() {
  // The only external requests in this preview: public champion names from Riot's Data Dragon CDN.
  try {
    const versionsResponse = await fetch('https://ddragon.leagueoflegends.com/api/versions.json', { signal: AbortSignal.timeout(6000) });
    if (!versionsResponse.ok) throw Error('versions unavailable');
    const versions = await versionsResponse.json();
    if (!Array.isArray(versions) || typeof versions[0] !== 'string') throw Error('invalid version list');
    const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${encodeURIComponent(versions[0])}/data/en_US/champion.json`, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw Error('champions unavailable');
    const data = await response.json();
    const parsed = normalizeChampions(data.data);
    if (!parsed.length) throw Error('invalid champion data');
    champions = parsed;
    dataVersion = versions[0];
    safelySave(championCacheKey, champions);
    populateDatalist();
    if (live?.locked) syncLockedChampion(live);
    if (live?.connected) syncEnemyPicks(live);
    await loadItemAndRuneCatalog(dataVersion);
  } catch {
    // Fallback supports offline demo with built-in names; this is deliberately non-blocking.
  }
}
async function loadItemAndRuneCatalog(version) {
  if (!version) return;
  const base=`https://ddragon.leagueoflegends.com/cdn/${encodeURIComponent(version)}/data/en_US/`;
  const requests=await Promise.allSettled([
    fetch(base+'item.json',{signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json():Promise.reject(Error('item catalog failed'))),
    fetch(base+'runesReforged.json',{signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json():Promise.reject(Error('rune catalog failed')))
  ]);
  if (requests[0].status==='fulfilled') itemCatalog=mapItemCatalog(requests[0].value.data);
  if (requests[1].status==='fulfilled') runeCatalog=mapRuneCatalog(requests[1].value);
  refresh();
}
const itemKey=name=>Object.keys(itemCatalog).find(n=>n.toLowerCase()===String(name).toLowerCase());
function itemIcon(name) {
  const item=itemCatalog[itemKey(name)];
  return item && dataVersion ? `<img class="item-icon" alt="" loading="lazy" src="https://ddragon.leagueoflegends.com/cdn/${encodeURIComponent(dataVersion)}/img/item/${encodeURIComponent(item.image)}" />` : `<span class="item-initial">${esc(name.slice(0,1))}</span>`;
}
function runeIcon(name) {
  const icon=runeCatalog[name];
  return icon ? `<img class="rune-icon" alt="" loading="lazy" src="https://ddragon.leagueoflegends.com/cdn/img/${esc(icon)}" />`: '<span class="rune-glyph">◆</span>';
}
function renderBuild(champion, role, enemies, compact=false) {
  if (!champion) return `<div class="build-empty">Lock a champion to see an actual six-item path. You can also select one manually in the browser demo.</div>`;
  const plan=getBuildPlan(champion,role,enemies);
  if (!plan) return `<div class="build-empty">No curated ${esc(role)} build for ${esc(champion)} yet. We won't generate a fake build. Currently supported: Briar, Amumu, Lillia and Warwick jungle; Sylas mid.</div>`;
  const changed=new Map(plan.reasons.filter(r=>plan.items.includes(r.item)).map(r=>[r.item,r]));
  const slots=plan.items.map((name,index)=>{
    const reason=changed.get(name);
    const validName=itemKey(name);
    const invalid=Object.keys(itemCatalog).length>0 && !validName;
    return `<div class="build-slot ${reason?'flex-slot':''}"><div class="slot-icon">${itemIcon(name)}</div><div class="slot-meta"><span class="slot-number">${index===1?'BOOTS':`SLOT ${index+1}`}</span><strong>${esc(name)}</strong>${reason?'<span class="changed-tag">VS THIS TEAM</span>':''}${invalid?'<span class="changed-tag caution">NOT FOUND ON LATEST PATCH</span>':''}</div></div>`;
  }).join('');
  const changes=plan.reasons.length?`<div class="build-reasons">${plan.reasons.map(r=>`<p><strong>${esc(r.item)}</strong> — ${esc(r.why)}</p>`).join('')}</div>`:'<p class="build-subnote">No major team-wide flex triggered yet. The baseline is still a starting point, not a guaranteed best build.</p>';
  const alternate=plan.alternateReason&&plan.alternate?`<details class="alt-build"><summary>Compare alternate path</summary><p>${esc(plan.alternateReason)}</p><div class="alt-pills">${plan.alternate.map(name=>`<span>${esc(name)}</span>`).join('')}</div></details>`:'';
  const patchFlag=dataVersion && !dataVersion.startsWith(REFERENCE_PATCH+'.')?`<span class="patch-warning">OUTDATED: live patch ${esc(dataVersion)}</span>`:'';
  return `<div class="build-panel"><div class="build-head"><div><div class="panel-eyebrow">${esc(champion.toUpperCase())} · ${esc(role.toUpperCase())} · 6 ITEMS</div><h3>${compact?'Build for this composition':'Reference item path'}</h3></div><span class="tiny-tag">CURATED PATCH ${esc(plan.patch)}</span></div><div class="item-slots">${slots}</div>${changes}${alternate}<div class="build-source">Reference researched Oct 13, 2026 · <a href="${esc(plan.source)}" target="_blank" rel="noopener noreferrer">Open original stats page ↗</a> · ${esc(plan.note)} ${patchFlag}</div></div>`;
}
function renderRunePage(plan) {
  if(!plan) return '<div class="empty-title">Curated runes unavailable</div><p class="empty-body">No full rune page has been verified for this champion/role yet. Matchup tips are available separately.</p>';
  const r=plan.runes;
  const tree=(title,tree,runes)=>`<div class="rune-tree-label">${esc(tree)} <span>${esc(title)}</span></div><div class="rune-grid">${runes.map((name,index)=>`<div class="rune-choice ${index===0&&title==='PRIMARY'?'keystone':''}">${runeIcon(name)}<span>${esc(name)}</span></div>`).join('')}</div>`;
  return `${tree('PRIMARY',r.primary,r.main)}${tree('SECONDARY',r.secondary,r.minor)}<div class="rune-shards"><span>SHARDS</span>${esc(r.shards.join(' · '))}</div><div class="rune-shards"><span>SKILL MAX</span>${esc(plan.skill)}</div><p class="info-footnote">Full rune reference from patch ${esc(plan.patch)}. Opponent-specific statistical rune optimizations are not calculated.</p>`;
}
function syncEnemyPicks(snap) {
  if (!snap?.connected) return;
  // New draft: clear old picks, but retain the previous match once loading starts.
  if (snap.phase==='ChampSelect' && lastPhase!=='ChampSelect') {
    selection.enemies=['','','','',''];
    selection.enemyManual=[false,false,false,false,false];
    selection.opponent='';
    el('opponent').value='';
    createEnemyInputs();
    persist();
  }
  lastPhase=snap.phase;
  if (snap.phase !== 'ChampSelect' || !Array.isArray(snap.enemyChampionIds)) return;
  let modified=false;
  snap.enemyChampionIds.slice(0,5).forEach((id,index)=>{
    if (selection.enemyManual[index] || !id) return;
    const name=championNameFromId(id);
    if(name && selection.enemies[index]!==name){
      selection.enemies[index]=name;
      const input=document.querySelector(`[data-enemy="${index}"]`);
      if(input) input.value=name;
      modified=true;
    }
  });
  if(modified)persist();
}

function renderMatchup() {
  const champion = chosenChampion(), opponent = chosenOpponent();
  const heading = champion ? (opponent ? `${champion} vs. ${opponent}` : `${champion} · opponent not chosen`) : 'Your next matchup';
  const hint = !champion ? 'Lock in a champion to begin.' : !opponent ? 'Select who you are actually facing; we never guess lanes.' : 'Your opponent affects the matchup tips; item swaps respond to the whole enemy composition.';
  el('matchup-banner').innerHTML = `<div class="banner-icon">${esc(champion ? champion[0] : '?')}</div><div class="banner-main"><div class="banner-kicker">${esc(selection.role.toUpperCase())} / MATCHUP</div><div class="banner-title">${esc(heading)}</div><div class="banner-hint">${esc(hint)}</div></div>`;
  const plan=getBuildPlan(champion,selection.role,selectedEnemies());
  el('matchup-build-output').innerHTML=renderBuild(champion,selection.role,selectedEnemies());
  el('runes-output').innerHTML=renderRunePage(plan);
  el('tips-output').innerHTML = matchupTips(champion,opponent).map((tip,i)=>`<div class="tip"><div class="tip-num">${String(i+1).padStart(2,'0')}</div><div><div class="tip-title">${esc(tip.title)}</div><div class="tip-text">${esc(tip.body)}</div></div></div>`).join('');
}
function renderTeam() {
  const team = selectedEnemies(), c = analyzeTeam(team);
  el('team-build-output').innerHTML = renderBuild(chosenChampion(),selection.role,team,true);
  const metrics = [['Magic-oriented', c.ap],['Physical-oriented', c.ad],['Mixed damage',c.mixed],['Hard CC',c.cc],['Sustain',c.healing]];
  el('team-summary').innerHTML = `<div class="summary-heading"><strong>Known enemy composition</strong><span>${c.total} / 5 champions selected</span></div><div class="bars">${metrics.map(([name, val]) => `<div><div class="bar-label"><span>${esc(name)}</span><span>${val}/${c.total || 5}</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,(val/Math.max(5,c.total))*100)}%"></div></div></div>`).join('')}</div><p class="info-footnote">Simplified kit categories. Damage mix and actual build paths can differ; categories aren't measured match statistics.</p>`;
  el('items-output').innerHTML = itemSuggestions(team).map(item => `<article class="analysis-card"><div class="analysis-tag">${esc(item.kind)}</div><div class="analysis-title">${esc(item.title)}</div><div class="analysis-copy">${esc(item.body)}</div></article>`).join('');
  const picks = compositionIdeas(team, selection.role);
  el('draft-status').textContent = live?.connected && !simulated ? (live.phase==='ChampSelect' ? `${team.length}/5 visible picks · ${live.enemySyncStatus || 'Waiting for locks'}. Editable slots remain yours until the next draft.` : `Last known draft: ${team.length}/5 · opens automatically during champion select.`) : 'Enemy picks auto-sync in supported draft queues on desktop. Type a name to override a slot.';
  el('counter-output').innerHTML = picks.length ? picks.map(p => `<article class="analysis-card"><div class="analysis-tag">${esc(selection.role)} · situational pick</div><div class="analysis-title">${esc(p.name)}</div><div class="analysis-copy">${esc(p.reason)}</div></article>`).join('') : '<div class="analysis-card"><div class="analysis-title">Add at least two enemies</div><div class="analysis-copy">We need more information to offer meaningful counterpick angles.</div></div>';
}
const fmtDelta = n => `${n > 0 ? '+' : ''}${n}`;
function championNameFromId(id) { return champions.find(c => Number(c.key) === Number(id))?.name || ''; }
function syncLockedChampion(snap) {
  if (!snap?.connected) return;
  if (snap.phase === 'ChampSelect' && !snap.locked) {
    if (selection.champion) { selection.champion=''; el('champion').value=''; persist(); }
  }
  if (!snap.locked || !snap.championId) return;
  const name = championNameFromId(snap.championId);
  if (name && selection.champion !== name) { selection.champion=name; el('champion').value=name; persist(); }
  const roleMap = {TOP:'Top',JUNGLE:'Jungle',MIDDLE:'Mid',BOTTOM:'Bot',UTILITY:'Support'};
  const role = roleMap[String(snap.role||'').toUpperCase()];
  if (role && selection.role !== role) { selection.role=role; el('role').value=role; persist(); }
}
function updateConnection() {
  const connected = Boolean(live?.connected);
  const connection = el('connection');
  connection.classList.toggle('offline', !connected);
  el('connection-text').textContent = connected ? `${live.gameName || 'League'} · ${live.phase || 'Lobby'}` : isDesktop ? (live?.status || 'Searching for League…') : simulated ? 'Simulated client' : 'Preview · desktop app required';
  el('connection-tag').textContent = connected && !simulated ? 'CONNECTED' : simulated ? 'DEMO' : 'LOCAL';
  el('champion').readOnly = connected && !simulated;
  el('champion-mode').textContent = connected ? (live.locked ? 'LOCKED · SYNCED' : 'WAITING FOR LOCK') : 'AUTO WHEN LOCKED';
}
function renderRanked() {
  const matches = journal.records || [];
  const wins = matches.filter(m => m.result === 'Win').length;
  const losses = matches.filter(m => m.result === 'Loss').length;
  const exact = matches.filter(m => Number.isInteger(m.delta));
  const total = exact.reduce((sum,m) => sum+m.delta,0);
  el('lp-stats').innerHTML = `<div class="stat-card"><div class="stat-label">Tracked ranked matches</div><div class="stat-value">${matches.length}</div></div><div class="stat-card"><div class="stat-label">Confirmed net LP <small>(same division)</small></div><div class="stat-value ${total>=0?'positive':'negative'}">${fmtDelta(total)}</div></div><div class="stat-card"><div class="stat-label">Record</div><div class="stat-value">${wins}<span style="color:#536475;font-size:18px"> / </span>${losses}</div></div>`;
  const state = journal.status || 'Waiting for the desktop League client';
  el('sync-heading').textContent = simulated ? 'Simulated ranked client' : live?.connected ? (live.gameName ? `Connected as ${live.gameName}` : 'League connected') : 'No League client detected';
  el('sync-detail').textContent = simulated ? `Browser-only simulated session. ${state}` : isDesktop ? state : 'Automatic champion and LP sync works in the desktop app. This browser preview cannot read the game client.';
  el('sync-indicator').textContent = live?.connected ? '●' : '○';
  el('ranked-source').textContent = simulated ? 'SIMULATION' : live?.connected ? 'LOCAL CLIENT' : 'WAITING';
  el('solo-current').textContent=rankText(live?.ranked?.solo);
  el('flex-current').textContent=rankText(live?.ranked?.flex);
  el('history-output').innerHTML = matches.length ? matches.slice().reverse().slice(0,40).map(m => {
    const before=rankText(m.before),after=rankText(m.after);
    const delta=Number.isInteger(m.delta)?`${fmtDelta(m.delta)} LP`:'Rank change';
    return `<div class="match-row"><div class="match-result ${m.result==='Win'?'win':'loss'}">${esc(m.result)}</div><div class="match-detail">${esc(championNameFromId(m.championId) || 'Ranked match')} <span class="muted">· ${m.queue==='flex'?'Flex':'Solo/Duo'}</span><span class="rank-shift">${esc(before)} → ${esc(after)}</span></div><div class="match-date">${esc(new Date(m.at).toLocaleDateString())}</div><div class="match-delta ${m.delta===null?'unknown':m.delta>=0?'positive':'negative'}">${esc(delta)}</div></div>`;
  }).join('') : `<div class="history-empty">No verified ranked games yet. Leave LaneLite open from champion select through the post-game LP update.</div>`;
}
function refresh() { renderMatchup(); renderTeam(); renderRanked(); }
function selectTab(name) {
  currentTab = name;
  document.querySelectorAll('.tab').forEach(t => { const active = t.dataset.tab === name; t.classList.toggle('active',active); t.setAttribute('aria-current',active?'page':'false'); });
  document.querySelectorAll('.tab-view').forEach(v => v.classList.toggle('hidden', v.id !== `${name}-view`));
  el('breadcrumb').textContent = {matchup:'Matchup',team:'Enemy team',ranked:'LP tracker'}[name] || name;
}
function syncInputs() {
  el('champion').value = selection.champion || '';
  el('opponent').value = selection.opponent || '';
  el('role').value = ['Jungle','Top','Mid','Bot','Support'].includes(selection.role) ? selection.role : 'Jungle';
  createEnemyInputs();
}
function getCsv() {
  const csvEscape = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const lines = [['date','queue','result','champion','rank_before','rank_after','lp_delta','classification','game_id'], ...journal.records.map(m=>[m.at,m.queue,m.result,championNameFromId(m.championId),rankText(m.before),rankText(m.after),m.delta??'',m.label,m.gameId??''])];
  return lines.map(row=>row.map(csvEscape).join(',')).join('\r\n');
}
function downloadCsv() {
  const url = URL.createObjectURL(new Blob([getCsv()], {type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'lanelite-confirmed-ranked.csv'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function pollLeague() {
  if (!isDesktop || inFlight) return;
  inFlight=true;
  try {
    const directory = safelyRead('lanelite.installPath.v2', '');
    const snapshot = await nativeInvoke('league_snapshot', {installDir:directory || null});
    live = snapshot;
    simulated = false;
    journal = tickJournal(journal,snapshot);
    safelySave(journalKey,journal);
    syncLockedChampion(snapshot);
    syncEnemyPicks(snapshot);
    updateConnection(); refresh();
  } catch {
    live={connected:false,status:'League integration unavailable'};
    journal.status='League integration unavailable';
    updateConnection();renderRanked();
  } finally { inFlight=false; }
}
function simulateRankedGame() {
  // Same tickJournal used by the Windows app; this merely drives it with labeled fixture data.
  simulated=true; journal=defaultJournal();
  const rank=(lp,wins=7,losses=6)=>({tier:'GOLD',division:'II',lp,wins,losses});
  const fake=(phase,lp,wins=7,extra={}) => ({connected:true,account:'DEMO-ONLY-NOT-A-RIOT-ACCOUNT',gameName:'Demo (not real)',phase,queueId:420,ranked:{solo:rank(lp,wins),flex:null},...extra});
  for (const snap of [fake('Lobby',43),fake('ChampSelect',43,7),fake('InProgress',43,7,{gameId:'simulated-1',championId:233}),fake('WaitingForStats',43),fake('Lobby',67,8)]) {
    live=snap; journal=tickJournal(journal,snap);
  }
  updateConnection(); refresh();selectTab('ranked');
}
function init() {
  populateDatalist();syncInputs(); updateConnection(); refresh(); selectTab('team');
  el('champion').addEventListener('input', e => { if (el('champion').readOnly) return; selection.champion=e.target.value; persist(); refresh(); });
  el('opponent').addEventListener('input', e => { selection.opponent=e.target.value; persist(); refresh(); });
  el('role').addEventListener('change', e => { selection.role=e.target.value; persist(); refresh(); });
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click',()=>selectTab(tab.dataset.tab)));
  el('sample-button').addEventListener('click',()=>{
    selection={champion:live?.locked?(championNameFromId(live.championId)||''):'Briar',opponent:'Warwick',role:'Jungle',enemies:['Warwick','Ahri','Leona','Jinx','Ornn'],enemyManual:[true,true,true,true,true]};
    persist();syncInputs();refresh();selectTab('team');
  });
  el('reset-enemies').addEventListener('click',()=>{selection.enemyManual=[false,false,false,false,false];selection.enemies=['','','','',''];persist();createEnemyInputs();if (live?.connected) syncEnemyPicks(live);refresh();});
  el('install-dir').value = safelyRead('lanelite.installPath.v2','');
  el('install-save').addEventListener('click',()=>{
    safelySave('lanelite.installPath.v2',el('install-dir').value.trim());
    el('install-help').textContent='Folder saved locally; reconnecting…';
    pollLeague();
  });
  el('export-button').addEventListener('click',downloadCsv);
  el('clear-button').addEventListener('click',()=>{
    if (!journal.records.length) return;
    if (!confirm('Clear all locally recorded ranked games? This cannot be undone.')) return;
    journal.records=[];if (journal.account) journal.historyByAccount[journal.account]=[];safelySave(journalKey,journal);renderRanked();
  });
  if (isDesktop) {pollLeague();setInterval(pollLeague,6500);}
  else {el('demo-actions').classList.remove('hidden');el('simulate-button').addEventListener('click',simulateRankedGame);}
  loadChampionCatalog().then(refresh);
}
init();
