import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectedWords, normalizeWord} from '../js/quran-data.js';
import {RecitationEngine} from '../js/recitation-engine.js';
const index = JSON.parse(readFileSync(new URL('../data/quran-index.json', import.meta.url)));
const surahs = JSON.parse(readFileSync(new URL('../data/surahs.json', import.meta.url)));
assert.equal(Object.keys(surahs).length, 114);
assert.equal(Object.keys(index.verses).length, 6236);
assert.equal(Object.keys(index.pages).length, 604);
for (const [number, surah] of Object.entries(surahs)) {
  assert.ok(selectedWords(index, +number, 1, surah.verses).length > 0, number);
  assert.ok(index.verses[`${number}:${surah.verses}`], number);
}
for (const page of [1, 2, 50, 200, 300, 450, 604]) {
  const key = index.pages[String(page)][0];
  assert.ok(index.verses[key].some(w => w.page === page));
}
assert.equal(normalizeWord('ٱللَّهُ'), normalizeWord('الله'));
const sample = selectedWords(index, 112, 1, 1);
assert.ok(sample.length >= 4);
let finished = false;
const engine = new RecitationEngine(sample, () => {}, () => {}, () => { finished = true; });
engine.silence(engine.lastSpeechAt + 8000);
assert.equal(engine.expected.attempts, 0);
engine.accept('كلمةمختلفة');
assert.equal(sample[0].state, 'incorrect-placeholder');
assert.equal(sample[0].revealed, false);
engine.accept('كلمةأخرى'); engine.accept('كلمةثالثة');
assert.equal(sample[0].revealedByErrorLimit, true);
assert.equal(engine.position, 1);
for (const word of sample.slice(1)) engine.accept(word.imlaey);
assert.equal(finished, true);
assert.ok(sample.every(w => w.revealed));
const repeated = selectedWords(index, 112, 1, 1);
const highlights = [];
const repetition = new RecitationEngine(repeated, (word, active) => { if (active) highlights.push(word.key); }, () => {}, () => {});
repetition.accept(repeated[0].imlaey);
repetition.accept(repeated[1].imlaey);
repetition.accept(repeated[0].imlaey);
assert.equal(repeated[0].revealed, true);
assert.equal(repeated[0].repeats, 1);
assert.ok(highlights.includes(repeated[0].key));
let boundary;
for (let surah = 1; surah <= 114 && !boundary; surah++) {
  for (let ayah = 1; ayah < surahs[surah].verses; ayah++) {
    const pair = selectedWords(index, surah, ayah, ayah + 1);
    if (pair.some((word,i) => i && word.page !== pair[i-1].page)) { boundary = pair; break; }
  }
}
assert.ok(boundary);
const transitions = [];
const crossPage = new RecitationEngine(boundary, () => {}, page => transitions.push(page), () => {});
const firstPage = boundary[0].page;
for (const word of boundary) { if (word.page !== firstPage) break; crossPage.accept(word.imlaey); }
assert.equal(transitions[0], boundary.find(word => word.page !== firstPage).page);
console.log('Quran index and recitation logic: passed');
