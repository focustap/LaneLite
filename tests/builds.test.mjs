import test from 'node:test';
import assert from 'node:assert/strict';
import {getBuildPlan,getBuildCoverage,mapItemCatalog,mapRuneCatalog} from '../web/builds.mjs';

test('five curated builds each contain six different real item names',()=>{
  for(const champion of getBuildCoverage()) {
    const role=champion==='Sylas'?'Mid':'Jungle';
    const result=getBuildPlan(champion,role,[]);
    assert.equal(result.items.length,6,champion);
    assert.equal(new Set(result.items).size,6,champion);
    assert.equal(result.runes.main.length,4);
    assert.equal(result.runes.minor.length,2);
  }
});
test('unsupported picks and wrong role never receive fabricated builds',()=>{
  assert.equal(getBuildPlan('Ahri','Mid'),null);
  assert.equal(getBuildPlan('Briar','Top'),null);
});
test('Briar counterbuild changes into magic-heavy enemy team',()=>{
  const p=getBuildPlan('Briar','Jungle',['Ahri','Lux','Lillia','Jinx','Ornn']);
  assert.ok(p.items.includes("Mercury's Treads"));
  assert.ok(p.items.includes('Spirit Visage'));
  assert.ok(!p.items.includes("Death's Dance"));
});
test('Briar anti-heal mutually excludes LDR',()=>{
  const p=getBuildPlan('Briar','Jungle',['Warwick','Vladimir','Jinx','Leona','Draven']);
  assert.ok(p.items.includes('Mortal Reminder'));
  assert.ok(!p.items.includes("Lord Dominik's Regards"));
});
test('Briar heavy frontline changes path',()=>{
  const p=getBuildPlan('Briar','Jungle',['Ornn','Rammus','Ahri','Jinx','Leona']);
  assert.ok(p.items.includes('Black Cleaver'));
  assert.ok(p.items.includes('Blade of The Ruined King'));
});
test('rune/item Data Dragon mappings',()=>{
  const items=mapItemCatalog({'1001':{name:'Boots',image:{full:'1001.png'},gold:{total:300}},'invalid':{name:'x'}});
  assert.equal(items.Boots.id,'1001');
  const runes=mapRuneCatalog([{slots:[{runes:[{name:'Conqueror',icon:'perk-images/Conqueror.png'}]}]}]);
  assert.equal(runes.Conqueror,'perk-images/Conqueror.png');
});
