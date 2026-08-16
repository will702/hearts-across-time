#!/usr/bin/env python3
"""Tutup seam tile horizontal pada PNG bg/fg FINAL di assets/ (plan 010).

Latar: seam_blend lama (pra-010) tidak pernah menyamakan kolom 0 dengan kolom
w-1, jadi junction tetap melompat (ukur: 50-335 deltaRGB/baris) walau bgprep
sudah dijalankan. Skrip ini menerapkan seam_blend TERKOREKSI dari build_sheets
langsung ke PNG final — tanpa regenerasi API, deterministik, interior >bw px
dari tepi tidak tersentuh.

  python scripts/fix_bg_seams.py            # proses daftar default (seam > 50)
  python scripts/fix_bg_seams.py a.png b.png --frac 0.08 --qc
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from build_sheets import seam_blend


def seamdiff(im: Image.Image) -> float:
    arr = np.asarray(im.convert("RGBA")).astype(np.int16)
    a, b = arr[:, 0], arr[:, -1]
    m = (a[:, 3] > 24) | (b[:, 3] > 24)
    if not m.any():
        return 0.0
    d = np.abs(a[m, :3] - b[m, :3]).sum()
    return float(d / m.sum())


DEFAULT = [  # layer dengan seamdiff > 50 saat audit 010
    "bg1944_far", "bg1944_mid", "bg1968A_far", "bg1968A_mid", "bg1968B_mid",
    "bg1999_far", "bg1999_mid", "bg2088_far", "bg2088_mid", "bg2088_near",
    "bg1968A_fg",
]


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    frac = 0.083  # bw ~160px pada 1920 — lebih sempit dari blend bgprep lama agar ghosting tak menumpuk
    qc = "--qc" in sys.argv
    for i, a in enumerate(sys.argv[1:]):
        if a == "--frac":
            frac = float(sys.argv[i + 2])
    names = args or DEFAULT
    root = Path(__file__).resolve().parent.parent
    ok = True
    for name in names:
        p = root / "assets" / (name if name.endswith(".png") else name + ".png")
        im = Image.open(p).convert("RGBA")
        before = seamdiff(im)
        fixed = seam_blend(im, frac)
        after = seamdiff(fixed)
        fixed.save(p)
        print(f"{p.name:20s} seamdiff {before:6.1f} -> {after:5.1f}")
        ok &= after < max(8.0, before * 0.25)
        if qc:
            canvas = Image.new("RGBA", (im.width * 2, im.height), (40, 40, 40, 255))
            canvas.alpha_composite(fixed, (0, 0))
            canvas.alpha_composite(fixed, (im.width, 0))
            q = root / "assets/gen" / f"{name}_qc_pair.png"
            canvas.save(q)
            print(f"  qc {q}")
    print(f"done fix_bg_seams ok={ok}")
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
