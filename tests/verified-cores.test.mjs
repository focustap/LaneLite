import test from 'node:test';
import assert from 'node:assert/strict';
import {getVerifiedCoreBuilds, VERIFIED_CORE_PATCH, VERIFIED_CORE_CAPTURED} from '../web/verified-cores.mjs';

test('Briar gets genuinely different crit and bruiser cores inside the app',()=>{
  const data=getVerifiedCoreBuilds('Briar','Jungle');
  assert.equal(data.patch,'16.21');
  assert.equal(data.cores.length,3);
  assert.deepEqual(data.cores[0].items,['The Collector','Titanic Hydra',"Lord Dominik's Regards"]);
  assert.deepEqual(data.cores[1].items,['Titanic Hydra','Black Cleaver',"Death's Dance"]);
  assert.deepEqual(data.cores[2].items,['Blade of The Ruined King','Black Cleaver',"Death's Dance"]);
  assert.ok(data.cores[0].games>data.cores[1].games);
  assert.ok(data.cores[2].games>1000);
  assert.notDeepEqual(data.cores[0].items.slice(0,2),data.cores[1].items.slice(0,2));
  assert.ok(data.cores.every(core=>core.items.length===3 && new Set(core.items).size===3));
});

test('all verified snapshots have source patch, nonzero joint samples, role and distinct core entries',()=>{
  for(const [champion,role] of [['Briar','Jungle'],['Amumu','Jungle'],['Lillia','Jungle'],['Warwick','Jungle'],['Sylas','Mid']]){
    const result=getVerifiedCoreBuilds(champion,role);
    assert.equal(result.patch,VERIFIED_CORE_PATCH);
    assert.equal(result.captured,VERIFIED_CORE_CAPTURED);
    assert.match(result.source,/^https:\/\/op\.gg\/lol\/champions\/[a-z]+\/build\//);
    assert.equal(result.cores.length,3);
    const signatures=result.cores.map(c=>c.items.join('|'));
    assert.equal(new Set(signatures).size,3);
    for(const c of result.cores){
      assert.equal(c.items.length,3);
      assert.ok(c.games>=100 && c.winRate>=0 && c.winRate<=100);
      assert.ok(c.label);
    }
  }
});

test('snapshot getter does not expose data across champion/role or return mutable internal state',()=>{
  assert.equal(getVerifiedCoreBuilds('Briar','Mid'),null);
  assert.equal(getVerifiedCoreBuilds('Ahri','Mid'),null);
  const a=getVerifiedCoreBuilds('Briar','Jungle');
  a.cores[0].items[0]='tampered';
  assert.equal(getVerifiedCoreBuilds('Briar','Jungle').cores[0].items[0],'The Collector');
});
