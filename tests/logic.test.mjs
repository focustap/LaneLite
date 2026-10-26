import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTeam, itemSuggestions, recommendRunes, compositionIdeas, lpDelta, normalizeChampions } from '../web/logic.mjs';

test('Briar has a curated rune direction but unknown champs do not', () => {
  assert.equal(recommendRunes('Briar', 'Warwick').title, 'Press the Attack');
  assert.equal(recommendRunes('Viego', 'Warwick').ready, false);
});

test('composition labels are deterministic for known champions', () => {
  const result = analyzeTeam(['Ahri','Amumu','Jinx','Leona','Briar']);
  assert.equal(result.total, 5);
  assert.equal(result.ap, 3);
  assert.equal(result.ad, 2);
  assert.equal(result.healing >= 1, true);
});

test('enemy item responses are conditional rather than universal', () => {
  const choices = itemSuggestions(['Ahri','Amumu','Lillia','Lux','Jinx']);
  assert.ok(choices.some(c => c.title === 'Magic resistance'));
  assert.ok(!choices.some(c => c.title === 'Armor'));
});

test('counter ideas are role-specific and need enough known enemies', () => {
  assert.deepEqual(compositionIdeas(['Malphite'],'Jungle'), []);
  const picks = compositionIdeas(['Jinx','Draven','Yasuo'], 'Top');
  assert.ok(picks.some(c => c.name === 'Malphite'));
});

test('LP journal shows exact signed delta and rejects blank input', () => {
  assert.equal(lpDelta(52,76),24);
  assert.equal(lpDelta(81,59),-22);
  assert.equal(lpDelta('',30),null);
});

test('Data Dragon API format normalizes names and keys', () => {
  const data = { Amumu:{id:'Amumu',key:'32',name:'Amumu'}, MonkeyKing:{id:'MonkeyKing',key:'62',name:'Wukong'}};
  const result = normalizeChampions(data);
  assert.equal(result[0].name,'Amumu');
  assert.equal(result[1].name,'Wukong');
});
