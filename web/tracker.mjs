/** Passive, local-only ranked state machine. Never invent a per-game LP delta. */
const RANKED_QUEUE = {420:'solo',440:'flex'};
const PLAYING = new Set(['GameStart','InProgress','Reconnect','PreEndOfGame','WaitingForStats','EndOfGame']);
export const defaultJournal = () => ({records:[],historyByAccount:{},pending:null,account:null,lastPhase:'',status:'Waiting for League'});

const usableRank = r => r && Number.isInteger(r.lp) && Number.isInteger(r.wins) && Number.isInteger(r.losses) && typeof r.tier === 'string' && typeof r.division === 'string';
const sameDivision = (a,b) => a.tier === b.tier && a.division === b.division;
const hasPlayed = phase => PLAYING.has(phase);
const stamped = value => Number.isFinite(Date.parse(value));
export function tickJournal(input, snap, at = new Date().toISOString()) {
  const state = structuredClone(input || defaultJournal());
  state.records ||= [];
  state.historyByAccount ||= {};
  if (!snap?.connected) { state.status='League client disconnected'; state.lastPhase=''; return state; }
  const account = String(snap.account || '').trim();
  if (!account) { state.status='Waiting for account identity'; return state; }
  if (state.account && state.account !== account) {
    // Keep each signed-in account's history separately rather than erase it.
    state.historyByAccount[state.account]=state.records;
    state.records=state.historyByAccount[account] || []; state.pending=null;
  }
  state.account=account;
  const phase = String(snap.phase || 'None');
  const queueId = Number(snap.queueId || 0);
  const queue = RANKED_QUEUE[queueId];
  const liveRank = queue ? snap.ranked?.[queue] : null;
  const prevPhase = state.lastPhase;
  state.lastPhase=phase;
  const pending = state.pending;
  const time = stamped(at) ? at : new Date().toISOString();
  if (pending) {
    const elapsed = Date.parse(time) - Date.parse(pending.startedAt);
    if (!Number.isFinite(elapsed) || elapsed > 1000*60*60*3) {
      state.pending=null;
      state.status='A match was missed; no guessed LP';
      return state;
    }
    if (pending.account !== account) { state.pending=null; state.status='Account switched'; return state; }
    if (!pending.played && (phase === 'Lobby' || phase === 'None')) {
      state.pending=null; state.status='Champ select ended without a match'; return state;
    }
    if (hasPlayed(phase)) pending.played = true;
    if (snap.gameId && !pending.gameId) pending.gameId=String(snap.gameId);
    if (snap.championId && !pending.championId) pending.championId=snap.championId;
    if (pending.played) {
      const rank = snap.ranked?.[pending.queue];
      if (usableRank(rank)) {
        const diff = (rank.wins + rank.losses) - (pending.before.wins + pending.before.losses);
        if (diff === 1) {
          const won = rank.wins - pending.before.wins === 1 && rank.losses === pending.before.losses;
          const lost = rank.losses - pending.before.losses === 1 && rank.wins === pending.before.wins;
          if (won || lost) {
            const exact = sameDivision(pending.before, rank);
            const record = {
              id: `${pending.account}/${pending.queue}/${pending.gameId || pending.startedAt}`,
              at: time, result:won?'Win':'Loss', queue:pending.queue,
              championId:pending.championId || null, before:pending.before, after:rank,
              delta: exact ? rank.lp - pending.before.lp : null,
              label: exact ? 'exact' : 'rank changed', gameId: pending.gameId || null
            };
            if (!state.records.some(r => r.id === record.id)) state.records.push(record);
            state.historyByAccount[account]=state.records;
            state.pending=null; state.status='Match recorded automatically';
            return state;
          }
        }
        if (diff > 1 || diff < 0) {
          state.pending=null; state.status='Multiple/unmatched ranked updates; skipped rather than guessing LP';
          return state;
        }
      }
    }
    state.status = pending.played ? 'Waiting for Riot to publish ranked results' : 'Ranked match armed';
    return state;
  }
  if (phase === 'ChampSelect' && queue && usableRank(liveRank) && prevPhase !== 'ChampSelect') {
    state.pending={ account,queue,queueId,gameId:snap.gameId?String(snap.gameId):null,championId:snap.championId||null,before:liveRank,played:false,startedAt:time};
    state.status='Tracking this ranked match';
    return state;
  }
  state.status = queue && phase === 'InProgress' ? 'Opened mid-match; no before-LP snapshot' : 'Connected · monitoring while open';
  return state;
}
export function rankText(rank) {
  return rank && Number.isInteger(rank.lp) ? `${rank.tier} ${rank.division} · ${rank.lp} LP` : 'Unranked / unavailable';
}
