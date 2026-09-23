import json
from pathlib import Path
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1]
data_path = root / 'src/data/pokemon.json'
assets = root / 'src/assets/pokemon'
data = json.loads(data_path.read_text(encoding='utf-8'))
sources = json.loads((assets / 'sources.json').read_text(encoding='utf-8'))
by_id = {x['id']: x for x in sources}
for p in data:
    old = root / 'src' / p['image'].removeprefix('./')
    filename = p['name'].replace('Mega ', 'Mega') + '.png'
    destination = assets / filename
    with Image.open(old) as original:
        rgba = original.convert('RGBA')
        rgba.save(destination, format='PNG')
        with Image.open(destination) as saved:
            assert saved.format == 'PNG'
            assert saved.size == original.size
            assert ImageChops.difference(rgba, saved.convert('RGBA')).getbbox() is None
            assert rgba.tobytes() == saved.convert('RGBA').tobytes()
    p['image'] = './assets/pokemon/' + filename
    by_id[p['id']]['file'] = filename
    by_id[p['id']]['format'] = 'PNG'
    # Remove only the superseded generated copy, never the user's source archive.
    if old != destination:
        old.unlink()
data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(assets / 'sources.json').write_text(json.dumps(sources, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Converted and pixel-verified {len(data)} transparent PNG images.')
