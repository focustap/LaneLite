import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeMcpResult,normalizeAnalysis,opggChampionName} from '../web/provider.mjs';
import {getCounterReference,referenceRows,lolalyticsLinks,summarizePersonal,nextPollDelay} from '../web/stats.mjs';

test('real OP.GG compact response preserves counter perspective and sample sizes',()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/opgg-briar.json',import.meta.url)));
  const a=normalizeAnalysis(decodeMcpResult(fixture));
  assert.equal(a.champion,'BRIAR');
  assert.equal(a.patch,'16.21');
  assert.equal(a.weak[0].name,"Rek'Sai");
  assert.equal(a.weak[0].winRate,41); // my_win_rate, never counter_win_rate.
  assert.equal(a.weak[0].games,198);
  assert.ok(a.synergies.some(r=>r.name==='Ahri' && r.position==='MID'));
  assert.ok(a.core.items.includes('Titanic Hydra'));
  assert.equal(a.runes.primary_rune_names[0],'Press the Attack');
});
test('provider accepts structured and JSON MCP results',()=>{
  assert.deepEqual(decodeMcpResult({structuredContent:{data:1}}),{data:1});
  assert.deepEqual(decodeMcpResult({content:[{type:'text',text:'{"data":2}'}]}),{data:2});
});
test('compact parser rejects executable expressions and unknown constructors',()=>{
  for(const text of ['process.exit(0)','class X: a\nX(1);alert(1)','class X: a\nX(1,2)', 'Unknown("x")'])
    assert.throws(()=>decodeMcpResult({content:[{type:'text',text}]}));
});
test('compact parser handles escapes, null, empty arrays and booleans',()=>{
  const text='class X: text,items,enabled,value\nX("hello \\"quoted\\"",[],True,None)';
  const x=decodeMcpResult({content:[{type:'text',text}]});
  assert.equal(x.text,'hello "quoted"');assert.deepEqual(x.items,[]);assert.equal(x.enabled,true);assert.equal(x.value,null);
});
test('missing or invalid sample rates are never rendered as percentages',()=>{
  const a=normalizeAnalysis({data:{summary:{average_stats:{win_rate:51}},weak_counters:[{champion_name:'x',play:5,my_win_rate:51}]}});
  assert.equal(a.winRate,null);assert.deepEqual(a.weak,[]);
});
test('LoLalytics references require the researched role and retain dated patch',()=>{
  assert.equal(getCounterReference('Briar','Top'),null);
  assert.equal(getCounterReference('Briar','Jungle').patch,'16.21');
  const rows=referenceRows('Briar','Jungle',['Warwick']);
  assert.equal(rows[0].opponent,'Warwick');assert.equal(rows[0].selected,true);
  assert.ok(rows.every(r=>r.games>=100));
});
test('champion URL and provider naming handles punctuation',()=>{
  assert.match(lolalyticsLinks('Nunu & Willump','Jungle',"Rek'Sai").matchup,/\/nunu\/vs\/reksai\//);
  assert.equal(opggChampionName("Rek'Sai"),'REK_SAI');assert.equal(opggChampionName('Dr. Mundo'),'DR_MUNDO');
});
test('personal sample deduplicates games, excludes remakes and filters role',()=>{
  const game={id:'1',championId:233,role:'Jungle',queueId:420,duration:1500,win:true,allies:[103,103],enemies:[19]};
  const a=summarizePersonal([game,game,{...game,id:'2',win:false},{...game,id:'3',duration:90},{...game,id:'4',role:'Top'}],233,'Jungle');
  assert.equal(a.games,2);assert.equal(a.winRate,50);assert.equal(a.allies[0].games,2);assert.equal(a.allies[0].delta,0);
  assert.equal(summarizePersonal([],233).winRate,null);
});
test('polling is responsive in draft and quiet while playing or disconnected',()=>{
  assert.equal(nextPollDelay({connected:true,phase:'ChampSelect'}),2500);
  assert.equal(nextPollDelay({connected:true,phase:'InProgress'}),20000);
  assert.equal(nextPollDelay({connected:false}),15000);
});
