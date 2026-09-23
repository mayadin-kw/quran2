#!/usr/bin/env python3
"""Fetch the public, attributed Mushaf SVG pages and Quran ONNX assets."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import urlopen, Request
import time

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "assets" / "mushaf"
MODEL = ROOT / "assets" / "models"
PAGES.mkdir(parents=True, exist_ok=True)
MODEL.mkdir(parents=True, exist_ok=True)

def download(url, target):
    if target.exists() and target.stat().st_size > 100:
        return str(target)
    for attempt in range(5):
        try:
            req = Request(url, headers={"User-Agent": "QuranMemorizationApp/1.0"})
            with urlopen(req, timeout=90) as src, target.with_suffix(target.suffix + ".part").open("wb") as dst:
                while True:
                    block = src.read(1024 * 1024)
                    if not block:
                        break
                    dst.write(block)
            target.with_suffix(target.suffix + ".part").replace(target)
            return str(target)
        except Exception:
            target.with_suffix(target.suffix + ".part").unlink(missing_ok=True)
            time.sleep(2 ** attempt)
    raise RuntimeError(url)

jobs = []
for page in range(1, 605):
    filename = f"{page:03}.svg"
    jobs.append((f"https://raw.githubusercontent.com/mushafdatabase/MushafDatabase-Ligature-Based-SVG/main/SVG%20V1.01/{filename}", PAGES / filename))
for filename in ("encoder.int8.onnx", "decoder.int8.onnx", "tokens.txt", "meta.json"):
    jobs.append((f"https://huggingface.co/voidwaveDev/fastconformer-quran/resolve/9dd2fd999fed6b38fbf251343cbd9a8f5253c810/{filename}?download=true", MODEL / filename))

with ThreadPoolExecutor(max_workers=8) as pool:
    futures = {pool.submit(download, url, path): path for url, path in jobs}
    for count, future in enumerate(as_completed(futures), 1):
        future.result()
        if count % 50 == 0 or count == len(jobs):
            print(f"{count}/{len(jobs)} assets", flush=True)
