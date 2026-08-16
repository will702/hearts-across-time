#!/usr/bin/env python3
"""Post-process AI prop strips into game-ready sprite strips.

Per prop (assets/gen/props/<id>.png, a horizontal 3-frame strip on magenta):
  1. flood_key magenta -> RGBA            (build_sheets.flood_key)
  2. slice into 3 equal columns, trim each
  3. re-anchor each frame bottom-center into a 200x200 cell
  4. compose 3x1 strip -> assets/prop_<id>.png
  5. QC montage on checkerboard -> assets/gen/props/<id>_qc.png

Usage:
  python scripts/build_props.py             # all raw strips found in assets/gen/props
  python scripts/build_props.py flag1944    # subset
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from build_sheets import flood_key, trim

CELL = 200
RAW = Path("assets/gen/props")


def proc(pid: str) -> bool:
    src = RAW / f"{pid}.png"
    if not src.exists():
        print(f"!! missing raw {src}", file=sys.stderr)
        return False
    raw = Image.open(src)
    im = flood_key(raw.convert("RGB"))
    if raw.mode == "RGBA":  # alpha hasil fix_props_key: perbatasan/area berlabel transparan ikut dipotong
        a_src = np.asarray(raw.getchannel("A"), np.uint8)
        ra = np.asarray(im).copy()
        ra[..., 3] = np.minimum(ra[..., 3], np.asarray(Image.fromarray(a_src).resize(im.size, Image.LANCZOS)))
        im = Image.fromarray(ra, "RGBA")
    im = trim(im, pad=0)
    w3 = im.width // 3
    cells = []
    for k in range(3):
        f = im.crop((k * w3, 0, (k + 1) * w3 if k < 2 else im.width, im.height))
        f = trim(f)
        s = (CELL - 8) / max(f.height, f.width * 0.9)  # tinggi penuh dulu; batasi lebar
        if f.width * s > CELL - 8:
            s = (CELL - 8) / f.width
        f = f.resize((max(1, round(f.width * s)), max(1, round(f.height * s))), Image.LANCZOS)
        cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        cell.alpha_composite(f, ((CELL - f.width) // 2, CELL - 4 - f.height))  # jangkar tengah-bawah
        cells.append(cell)
    strip = Image.new("RGBA", (CELL * 3, CELL), (0, 0, 0, 0))
    for k, cell in enumerate(cells):
        strip.alpha_composite(cell, (k * CELL, 0))
    out = Path("assets") / f"prop_{pid}.png"
    strip.save(out)
    # QC: strip di atas papan catur + pemisah sel
    bg = Image.new("RGBA", (strip.width * 2, strip.height * 2), (64, 64, 72, 255))
    d = ImageDraw.Draw(bg)
    for y in range(0, bg.height, 20):
        for x in range(0, bg.width, 20):
            if (x // 20 + y // 20) % 2 == 0:
                d.rectangle([x, y, x + 19, y + 19], fill=(86, 86, 98, 255))
    bg.alpha_composite(strip.resize((strip.width * 2, strip.height * 2), Image.LANCZOS))
    for k in range(3):
        x = (k * CELL + CELL // 2) * 2
        for yy in range(0, bg.height, 12):
            d.point((x, yy), fill=(255, 255, 0, 255))
    qc = RAW / f"{pid}_qc.png"
    bg.convert("RGB").save(qc)
    print(f"prop {out} {strip.size}  QC {qc}")
    return True


def main() -> int:
    want = sys.argv[1:] or sorted(p.stem for p in RAW.glob("*.png") if not p.stem.endswith("_qc"))
    ok = all(proc(pid) for pid in want)
    print(f"done build_props ok={ok}")
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
