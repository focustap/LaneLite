import test from 'node:test';
import assert from 'node:assert/strict';
import {tickJournal, defaultJournal} from '../web/tracker.mjs';
const rank=(lp,wins=15,losses=12,tier='GOLD',division='II')=>({lp,wins,losses,tier,division});
const snap=(phase,lp,wins=15,losses=12,extras={})=>({connected:true, account:'demo-puuid',phase,queueId:420,ranked:{solo:rank(lp,wins,losses)},...extras});
const t=(j,s,iso='2026-10-13T19:00:00Z')=>tickJournal(j,s,iso);
test('records exact LP once for a completed ranked game, not while merely selecting',()=>{
 let j=t(defaultJournal(),snap('Lobby',60));
 j=t(j,snap('ChampSelect',60,15,12)); // unchanged totals
 j=t(j,snap('InProgress',60,15,12,{championId:233,gameId:123}));
 assert.equal(j.records.length,0);
 j=t(j,snap('WaitingForStats',60));
 j=t(j,snap('Lobby',84,16,12));
 assert.equal(j.records.length,1); assert.equal(j.records[0].delta,24); assert.equal(j.records[0].championId,233);
 j=t(j,snap('Lobby',84,16,12)); assert.equal(j.records.length,1);
});
test('no fake LP delta across promotion or demotion',()=>{
 let j=t(defaultJournal(),snap('ChampSelect',92));
 j=t(j,snap('InProgress',92));
 const after=snap('Lobby',17,16,12); after.ranked.solo=rank(17,16,12,'GOLD','I');
 j=t(j,after); assert.equal(j.records[0].delta,null); assert.equal(j.records[0].label,'rank changed');
});
test('never synthesizes history when opened midgame',()=>{
 let j=t(defaultJournal(),snap('InProgress',60));
 j=t(j,snap('Lobby',80,16,12)); assert.equal(j.records.length,0);
});
test('never conflates more than one missed match',()=>{
 let j=t(defaultJournal(),snap('ChampSelect',60));
 j=t(j,snap('InProgress',60)); j=t(j,snap('Lobby',90,17,12));
 assert.equal(j.records.length,0); assert.match(j.status,/skipped/i);
});
test('account changes clear incompatible queue state',()=>{
 let j=t(defaultJournal(),snap('ChampSelect',60));
 j=t(j,{...snap('InProgress',60),account:'other-account'});
 assert.equal(j.pending,null); assert.equal(j.account,'other-account');
});
test('account history restores when switching back',()=>{
 let j=t(defaultJournal(),snap('ChampSelect',60));
 j=t(j,snap('InProgress',60));j=t(j,snap('Lobby',84,16,12));
 assert.equal(j.records.length,1);
 j=t(j,{...snap('Lobby',10),account:'other'});
 assert.equal(j.records.length,0);
 j=t(j,snap('Lobby',84,16,12));
 assert.equal(j.records.length,1);
});
test('nothing logged if game never actually started',()=>{
 let j=t(defaultJournal(),snap('ChampSelect',60));
 j=t(j,snap('Lobby',60)); j=t(j,snap('Lobby',60)); assert.equal(j.records.length,0);
});
