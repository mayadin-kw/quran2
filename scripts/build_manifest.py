#!/usr/bin/env python3
"""Generate the offline recitation package manifest with real sizes and hashes."""
from pathlib import Path
import hashlib, json
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[1]
groups = [
    ('mushaf-svg', 'صفحات المصحف', sorted((root / 'assets/mushaf').glob('*.svg'))),
    ('quran-data', 'بيانات القرآن', [root / 'data/quran-index.json', root / 'data/surahs.json']),
    ('speech-model', 'نموذج التعرف الصوتي', sorted((root / 'assets/models').iterdir())),
    ('speech-runtime', 'محرك الاستماع', sorted((root / 'assets/vendor').iterdir()) +
     [root / 'js/asr-worker.js', root / 'js/audio-worklet.js', root / 'js/asr-engine.js', root / 'js/microphone.js']),
    ('app-shell', 'ملفات التطبيق', [root / 'index.html', root / 'css/app.css', root / 'service-worker.js'] +
     [p for p in sorted((root / 'js').glob('*.js')) if p.name not in {'asr-worker.js', 'audio-worklet.js', 'asr-engine.js', 'microphone.js'}]),
]
output = []
for group_id, name, paths in groups:
    files = []
    for path in paths:
        if not path.exists():
            raise SystemExit(f'Missing {path}')
        digest = hashlib.sha256()
        with path.open('rb') as source:
            while block := source.read(1024 * 1024):
                digest.update(block)
        url = path.relative_to(root).as_posix()
        if path.name == 'encoder.int8.onnx':
            url = 'https://huggingface.co/voidwaveDev/fastconformer-quran/resolve/9dd2fd999fed6b38fbf251343cbd9a8f5253c810/encoder.int8.onnx?download=true'
        files.append({'url': url, 'bytes': path.stat().st_size, 'sha256': digest.hexdigest()})
    output.append({'id': group_id, 'nameAr': name, 'required': True, 'files': files})
manifest = {'packageId': 'recitation-core', 'version': '1.0.0',
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'totalBytes': sum(file['bytes'] for group in output for file in group['files']),
            'groups': output}
(root / 'data/recitation-assets-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')))
print(f"{sum(map(lambda g: len(g['files']), output))} files, {manifest['totalBytes']:,} bytes")
