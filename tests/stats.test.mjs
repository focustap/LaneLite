import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeMcpResult,normalizeAnalysis,getProviderBuildPaths,opggChampionName} from '../web/provider.mjs';
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
test('single OP.GG core never masquerades as three different builds',()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/opgg-briar.json',import.meta.url)));
  const analysis=normalizeAnalysis(decodeMcpResult(fixture));
  const paths=getProviderBuildPaths(analysis);
  assert.equal(paths.length,1);
  assert.deepEqual(paths[0].core.items,['The Collector','Titanic Hydra',"Lord Dominik's Regards"]);
  assert.ok(paths[0].items.includes('Plated Steelcaps'));
  assert.equal(paths[0].items.length,4);
  assert.equal(paths[0].winRate,undefined);
});

test('multiple genuinely distinct, independently sampled cores can be selected',()=>{
  const rows=[
    {ids_names:['Collector','Titanic','LDR'],play:4000,win:2100},
    {ids_names:['Collector','Profane','LDR'],play:3000,win:1700}, // only one different: exclude
    {ids_names:['Blade of The Ruined King','Black Cleaver',"Death's Dance"],play:2000,win:1100},
    {ids_names:['Titanic','Black Cleaver',"Death's Dance"],play:1700,win:950}, // only one different from bruiser: exclude
    {ids_names:['Sundered Sky','Sterak','Trinity Force'],play:900,win:500}
  ];
  const a=normalizeAnalysis({data:{summary:{average_stats:{play:15000}},core_items:rows,boots:{ids_names:['Boots'],play:5000,win:2600}}});
  const paths=getProviderBuildPaths(a);
  assert.equal(a.cores.length,5);
  assert.equal(paths.length,3);
  assert.deepEqual(paths.map(p=>p.core.games),[4000,2000,900]);
  for(const p of paths){
    assert.equal(p.items.length,4); // jointly sampled core + separately sampled boots
    assert.equal(new Set(p.items).size,4);
    assert.equal(p.winRate,undefined); // no fabricated 6-item WR
  }
});

test('late item swaps alone are not independent full builds',()=>{
  const core={items:['Item A','Item B','Item C'],games:250,winRate:55};
  const minimal={core,boots:{items:['Boots']},fourth:[{items:['Item D'],games:120,winRate:50}],fifth:[],sixth:[]};
  const paths=getProviderBuildPaths(minimal);
  assert.equal(paths.length,1);
  assert.deepEqual(paths[0].items,['Item A','Item B','Item C','Boots']);
  assert.equal(getProviderBuildPaths({core:null}).length,0);
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
