import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const wrapper = {exports:{}};
new Function('module','exports','require',readFileSync('assets/vendor/ort.min.js','utf8'))(wrapper,wrapper.exports,require);
const ort = wrapper.exports;
ort.env.wasm.wasmPaths = resolve('assets/vendor') + '/';
ort.env.wasm.numThreads = 1;
const encoder = await ort.InferenceSession.create(new Uint8Array(readFileSync('assets/models/encoder.int8.onnx')), {executionProviders:['wasm']});
const decoder = await ort.InferenceSession.create(new Uint8Array(readFileSync('assets/models/decoder.int8.onnx')), {executionProviders:['wasm']});
const tokens = [];
for (const line of readFileSync('assets/models/tokens.txt','utf8').trim().split(/\r?\n/)) {
  const match = line.match(/^(.*)\s+(\d+)$/); if (match) tokens[Number(match[2])] = match[1];
}
const messages = [];
const context = vm.createContext({ort, self:{postMessage:message => messages.push(message)}, console, performance, Float32Array, Uint8Array, BigInt64Array, Int32Array, BigInt, Number, Math, Array, Date});
const code = readFileSync('js/asr-worker.js','utf8') + '\nglobalThis.runSample = async (samples,e,d,t) => {encoder=e;decoder=d;vocabulary=t;await infer(samples);};';
vm.runInContext(code, context);
const samplePath = process.argv[2];
if (!samplePath) throw Error('مرّر مسار ملف صوت خام float32 أحادي القناة بسرعة 16 كيلوهرتز');
const raw = readFileSync(samplePath);
const pcm = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
for (const length of [12000,18000,24000]) await context.runSample(pcm.slice(0, Math.min(pcm.length, length)),encoder,decoder,tokens);
await context.runSample(pcm,encoder,decoder,tokens);
console.log(messages);
