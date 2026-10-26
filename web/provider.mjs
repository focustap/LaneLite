// OP.GG currently returns a compact typed-text representation over MCP.
// Parse data only: no eval, dynamic code, arbitrary tools or executable content.
export function decodeMcpResult(result) {
  if (result?.isError) throw Error('OP.GG could not supply this champion/role');
  if (result?.structuredContent) return result.structuredContent;
  const raw=(result?.content || []).filter(c=>c.type==='text').map(c=>c.text).join('\n');
  if (!raw || raw.length>2_000_000) throw Error('Unsupported OP.GG response');
  try {return JSON.parse(raw);} catch { /* compact text below */ }
  const classes=new Map();
  let source=raw;
  source=source.replace(/^class (\w+): ([^\n]+)\r?\n/gm, (_,name,fields)=>{
    classes.set(name,fields.split(',').map(f=>f.trim())); return '';
  }).trim();
  let at=0;
  const ws=()=>{while(/\s/.test(source[at] || '') && at<source.length)at++;};
  function value(depth=0) {
    if(depth>40)throw Error('Response is too deeply nested');
    ws(); const ch=source[at];
    if(ch==='"') {
      const start=at++;
      while(at<source.length) {if(source[at]==='\\'){at+=2;continue;}if(source[at++]==='"')return JSON.parse(source.slice(start,at));}
      throw Error('Unterminated string');
    }
    if(ch==='[') {at++; const arr=[];ws();if(source[at]===']'){at++;return arr;}
      while(at<source.length){arr.push(value(depth+1));ws();const c=source[at++];if(c===']')return arr;if(c!==',')throw Error('Invalid list');}
      throw Error('Unterminated list');
    }
    const number=source.slice(at).match(/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if(number){at+=number[0].length;const n=Number(number[0]);if(!Number.isFinite(n))throw Error('Invalid number');return n;}
    const identifier=source.slice(at).match(/^[A-Za-z_]\w*/)?.[0];
    if(!identifier)throw Error('Invalid data token');
    at+=identifier.length;ws();
    if(['null','None'].includes(identifier))return null;
    if(['true','True'].includes(identifier))return true;
    if(['false','False'].includes(identifier))return false;
    const fields=classes.get(identifier);
    if(!fields || source[at++]!=='(')throw Error('Unknown data record');
    const args=[];ws();
    if(source[at]!==')')while(at<source.length){args.push(value(depth+1));ws();if(source[at]===')')break;if(source[at++]!==',')throw Error('Invalid record');}
    if(source[at++]!==')' || args.length!==fields.length)throw Error('Record schema changed');
    return Object.fromEntries(fields.map((f,i)=>[f,args[i]]));
  }
  const parsed=value();ws();if(at!==source.length)throw Error('Unexpected response content');return parsed;
}

export const opggChampionName = name => ({
  "Nunu & Willump":'NUNU',"Renata Glasc":'RENATA_GLASC','Wukong':'WUKONG',
  'Jarvan IV':'JARVAN_IV','Dr. Mundo':'DR_MUNDO',"Rek'Sai":'REK_SAI',"Kha'Zix":'KHA_ZIX',
  "Cho'Gath":'CHO_GATH',"Kai'Sa":'KAI_SA',"Kog'Maw":'KOG_MAW',"Vel'Koz":'VEL_KOZ',
  "Bel'Veth":'BEL_VETH',"K'Sante":'K_SANTE','Lee Sin':'LEE_SIN','Master Yi':'MASTER_YI',
  'Miss Fortune':'MISS_FORTUNE','Aurelion Sol':'AURELION_SOL','Twisted Fate':'TWISTED_FATE',
  'Xin Zhao':'XIN_ZHAO','Tahm Kench':'TAHM_KENCH','LeBlanc':'LE_BLANC'
}[name] || String(name).toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,''));
export const opggPosition = role => ({Jungle:'jungle',Top:'top',Mid:'mid',Bot:'adc',Support:'support'}[role] || 'jungle');
const rate = n => typeof n==='number' && Number.isFinite(n) && n>=0 && n<=1 ? n*100 : null;
const count = n => Number.isInteger(n) && n>=0 ? n : null;
export function normalizeAnalysis(raw) {
  const data=raw?.data;
  if(!data || !data.summary)throw Error('No OP.GG stats for this role');
  const counters=rows=>(Array.isArray(rows)?rows:[]).filter(r=>r?.champion_name && count(r.play)>0 && rate(r.my_win_rate)!==null)
    .map(r=>({name:r.champion_name,id:r.champion_id,games:r.play,winRate:rate(r.my_win_rate)}));
  const synergies=Object.entries(data.synergies || {}).flatMap(([position,rows])=>(Array.isArray(rows)?rows:[])
    .filter(r=>r?.synergy_champion_name && count(r.play)>0 && rate(r.win_rate)!==null)
    .map(r=>({name:r.synergy_champion_name,id:r.synergy_champion_id,position:r.synergy_position || position,
      games:r.play,winRate:rate(r.win_rate)})));
  const item=row=>row && Array.isArray(row.ids_names) && count(row.play)>0 ? {
    items:row.ids_names,ids:row.ids || [],games:row.play,
    winRate:count(row.win)!==null && row.win<=row.play ? 100*row.win/row.play : null
  }:null;
  const summary=data.summary.average_stats || {};
  return {champion:raw.champion,position:raw.position,winRate:rate(summary.win_rate),games:count(summary.play),
    pickRate:rate(summary.pick_rate),banRate:rate(summary.ban_rate),weak:counters(data.weak_counters),strong:counters(data.strong_counters),
    synergies,core:item(data.core_items),boots:item(data.boots),starter:item(data.starter_items),
    fourth:(data.fourth_items || []).map(item).filter(Boolean),fifth:(data.fifth_items || []).map(item).filter(Boolean),
    sixth:(data.sixth_items || []).map(item).filter(Boolean),
    runes:data.runes || null,skills:data.skills?.order || [],
    patch:data.trends?.win?.version || null,countersMeta:data.counters_meta || null};
}

export function completeProviderBuild(analysis) {
  if(!analysis?.core?.items?.length)return [];
  const out=[];
  const add=names=>{for(const name of names || [])if(typeof name==='string' && !out.includes(name) && out.length<6)out.push(name);};
  add(analysis.core.items.slice(0,1));add(analysis.boots?.items);add(analysis.core.items.slice(1));
  for(const rows of [analysis.fourth,analysis.fifth,analysis.sixth]) {
    const candidate=(rows || []).find(r=>r.items.some(n=>!out.includes(n)));
    if(candidate)add(candidate.items);
  }
  return out;
}
