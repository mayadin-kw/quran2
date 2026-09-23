#!/usr/bin/env python3
"""Build a compact word index from the 604 semantic Mushaf SVG pages."""
from pathlib import Path
import xml.etree.ElementTree as ET
import json
from urllib.request import urlopen, Request

root = Path(__file__).resolve().parents[1]
pages_dir = root / "assets" / "mushaf"
output = root / "data"
output.mkdir(exist_ok=True)
chapters_file = Path('/private/tmp/quran-chapters.json')
if chapters_file.exists():
    chapters = json.loads(chapters_file.read_text())['chapters']
else:
    request = Request('https://api.quran.com/api/v4/chapters?language=ar', headers={'User-Agent':'QuranMemorizationApp/1.0'})
    with urlopen(request, timeout=30) as response:
        chapters = json.load(response)['chapters']
surahs = {str(c['id']): {'name': c['name_arabic'], 'verses': c['verses_count']} for c in chapters}
verses = {}
pages = {}
word_count = 0
for page in range(1, 605):
    path = pages_dir / f'{page:03}.svg'
    if not path.exists():
        raise SystemExit(f'Missing {path}')
    svg = ET.parse(path).getroot()
    page_verses = set()
    for item in svg.iter():
        if not item.attrib.get('id', '').startswith('md-word-') or item.get('data-type') != 'text':
            continue
        s, a, w = [int(item.get(key)) for key in ('data-surah', 'data-aya', 'data-word-index-in-ayah')]
        key = f'{s}:{a}'
        record = {'page': page, 'line': int(item.get('data-line-number')), 'index': w,
                  'hafs': item.get('data-hafs'), 'imlaey': item.get('data-imlaey'), 'id': item.get('id')}
        verses.setdefault(key, []).append(record)
        page_verses.add(key)
        word_count += 1
    pages[str(page)] = sorted(page_verses, key=lambda k: tuple(map(int, k.split(':'))))
for words in verses.values():
    words.sort(key=lambda w: w['index'])
if len(verses) != 6236:
    raise SystemExit(f'Expected 6236 verses, got {len(verses)}')
if len(surahs) != 114:
    raise SystemExit('Missing chapter metadata')
index = {'source': 'MushafDatabase SVG V1.01', 'pages': pages, 'verses': verses,
         'totals': {'pages': 604, 'surahs': 114, 'verses': len(verses), 'words': word_count}}
(output / 'quran-index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')))
(output / 'surahs.json').write_text(json.dumps(surahs, ensure_ascii=False, separators=(',', ':')))
print(index['totals'])
