import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DownloadManager, formatEta} from '../js/download-manager.js';
const manifest = JSON.parse(readFileSync('data/recitation-assets-manifest.json'));
const file = manifest.groups.flatMap(group => group.files).find(entry => entry.url === 'data/surahs.json');
const bytes = readFileSync(file.url);
const stored = new Map();
const manager = new DownloadManager();
manager.cache = {
  delete: async key => stored.delete(key),
  put: async (key, response) => stored.set(key, new Response(await response.arrayBuffer(), {headers: response.headers})),
  match: async key => stored.get(key)?.clone()
};
manager.missingBytes = file.bytes;
globalThis.fetch = async url => new Response(bytes, {headers:{'content-type':'application/json'}});
await manager.download(file);
assert.equal(manager.downloadedBytes, file.bytes);
assert.equal((await manager.cache.match(file.url)).headers.get('x-quran-sha256'), file.sha256);
assert.equal(formatEta(15), 'أقل من دقيقة');
assert.equal(formatEta(100), 'حوالي دقيقتين');
console.log('Streaming download and integrity: passed');
