import assert from 'node:assert/strict';
import {readFileSync, createReadStream, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SHA256} from '../js/sha256.js';
const manifest = JSON.parse(readFileSync('data/recitation-assets-manifest.json'));
assert.equal(new SHA256().update(new TextEncoder().encode('abc')).digest(),
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
let size = 0, count = 0;
for (const group of manifest.groups) for (const file of group.files) {
  const path = file.url.startsWith('https://') ? 'assets/models/encoder.int8.onnx' : file.url;
  assert.ok(existsSync(path), path);
  const digest = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(path)) { digest.update(chunk); bytes += chunk.length; }
  assert.equal(bytes, file.bytes, path); assert.equal(digest.digest('hex'), file.sha256, path);
  size += bytes; count++;
}
assert.equal(size, manifest.totalBytes);
console.log(`${count} manifest assets, ${size} bytes: passed`);
