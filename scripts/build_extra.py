#!/usr/bin/env python3
"""Post-process fg occluder layers + key poses into assets/.

  fg:    assets/gen/fg/bg<era>_fg.png -> bgprep (key, cap 260px, width 1920, seal, seam) -> assets/bg<era>_fg.png
  poses: assets/gen/poses/pose_*.png  -> flood_key + trim -> assets/pose_*.png (+QC montage)

Usage: python scripts/build_extra.py [fg|poses|all]
"""
import sys
from pathlib import Path

import subprocess
from PIL import Image, ImageDraw

from build_sheets import flood_key, trim

BS = Path(__file__).with_name("build_sheets.py")


def darken(path, target=(17, 13, 10), k=0.78):
    """Dorong semua piksil ter-key ke siluet gelap komik (menelan sisa magenta/pixel terang)."""
    import numpy as np
    im = Image.open(path).convert("RGBA")
    arr = np.asarray(im).astype(np.float32)
    arr[..., :3] = arr[..., :3] * (1 - k) + np.array(target, dtype=np.float32) * k
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").save(path)


def do_fg() -> bool:
    ok = True
    for raw in sorted(Path("assets/gen/fg").glob("bg*_fg.png")):
        out = Path("assets") / (raw.stem + ".png")
        p = subprocess.run([sys.executable, str(BS), "bgprep", str(raw), str(out),
                            "--maxh", "260", "--width", "1920", "--depink", "1.0", "--blend", "0.25"], capture_output=True, text=True)
        print(p.stdout.strip() or p.stderr.strip())
        ok &= p.returncode == 0 and out.exists()
        if ok:
            darken(out)
            print(f"darkened {out}")
    return ok


def do_poses() -> bool:
    ok = True
    for raw in sorted(Path("assets/gen/poses").glob("pose_*.png")):
        if raw.stem.endswith("_qc"):
            continue
        im = trim(flood_key(Image.open(raw).convert("RGB")), pad=2)
        out = Path("assets") / (raw.stem + ".png")
        im.save(out)
        # QC di atas papan catur
        bg = Image.new("RGBA", (im.width * 2, im.height * 2), (64, 64, 72, 255))
        d = ImageDraw.Draw(bg)
        for y in range(0, bg.height, 20):
            for x in range(0, bg.width, 20):
                if (x // 20 + y // 20) % 2 == 0:
                    d.rectangle([x, y, x + 19, y + 19], fill=(86, 86, 98, 255))
        bg.alpha_composite(im.resize((im.width * 2, im.height * 2), Image.LANCZOS))
        qc = raw.with_name(raw.stem + "_qc.png")
        bg.convert("RGB").save(qc)
        print(f"pose {out} {im.size} QC {qc}")
    return ok


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    ok = True
    if mode in ("fg", "all"):
        ok &= do_fg()
    if mode in ("poses", "all"):
        ok &= do_poses()
    print(f"done build_extra ok={ok}")
    sys.exit(0 if ok else 2)
