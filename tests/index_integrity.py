from pathlib import Path
import json
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
index = json.loads((root / 'data/quran-index.json').read_text())
seen = 0
for page in range(1, 605):
    svg = ET.parse(root / 'assets/mushaf' / f'{page:03}.svg').getroot()
    page_words = set()
    markers = 0
    for element in svg.iter():
        attrs = element.attrib
        if attrs.get('id','').startswith('md-aya-mark-'):
            markers += 1
        if not attrs.get('id','').startswith('md-word-') or attrs.get('data-type') != 'text':
            continue
        key = f"{int(attrs['data-surah'])}:{int(attrs['data-aya'])}"
        word = int(attrs['data-word-index-in-ayah'])
        page_words.add((key,word))
        assert any(w['page'] == page and w['index'] == word and w['hafs'] == attrs['data-hafs']
                   for w in index['verses'][key]), (page,key,word)
        seen += 1
    assert page_words and markers, page
assert seen == index['totals']['words']
print(f'604 SVG pages and {seen} indexed words: passed')
