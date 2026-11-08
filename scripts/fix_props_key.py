#!/usr/bin/env python3
"""One-off cleanup for prop raws whose pink backgrounds survived flood_key.

  flare1944: enclosed pastel-pink panels (h~0.85, s~0.27) behind the flare art,
             separated from the magenta border by ink lines -> flood can't reach.
  frost1999: enclosed saturated-pink metal plates + purple shadow cast below grate +
             vapor wisps tinted pink -> plate/purple keyed, vapor re-hued cold.

Writes RGBA over the raws; build_props.proc multiplies that alpha into the strip.
QC panel JPEGs (checkerboard) are written alongside for eyeballing.

Usage: python scripts/fix_props_key.py [flare1944 frost1999]
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from build_sheets import flood_key

RAW = Path("assets/gen/props")


def bg_hue(rgb):
    """Estimate background hue from saturated corner pixels (identity from corners)."""
    import colorsys
    r, g, b = rgb[..., 0] / 255, rgb[..., 1] / 255, rgb[..., 2] / 255
    mx = np.max(rgb / 255, axis=2)
    mn = np.min(rgb / 255, axis=2)
    sat = np.where(mx > 1e-6, (mx - mn) / mx, 0)
    pts = np.concatenate([rgb[:80, :80].reshape(-1, 3), rgb[:80, -80:].reshape(-1, 3),
                          rgb[-80:, :80].reshape(-1, 3), rgb[-80:, -80:].reshape(-1, 3)]) / 255
    satc = np.concatenate([sat[:80, :80].ravel(), sat[:80, -80:].ravel(), sat[-80:, :80].ravel(), sat[-80:, -80:].ravel()])
    hues = np.array([colorsys.rgb_to_hsv(*p)[0] for p in pts[satc > 0.25]])
    return float(np.median(hues)) if len(hues) else 0.833


def rgb2hsv_np(rgb):
    import colorsys
    flat = (rgb / 255.0).reshape(-1, 3)
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in flat])
    return hsv.reshape(rgb.shape)


def flood_from_edges(mask):
    """Flood-fill True region connected to any image border."""
    H, W = mask.shape
    seen = np.zeros_like(mask)
    dq = deque()
    for x in range(W):
        for y in (0, H - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True; dq.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True; dq.append((yy, xx))
    return seen


def panel_seed(bg_mask):
    """Split each horizontal third into fixed cells (raws are 3-panel strips);
    return bg pixels of the biggest bg blob per cell (the framed pink panel)."""
    H, W = bg_mask.shape
    w3 = W // 3
    out = np.zeros_like(bg_mask)
    for k in range(3):
        x0, x1 = k * w3, (k + 1) * w3 if k < 2 else W
        m = bg_mask[:, x0:x1]
        seen = np.zeros_like(m)
        blobs = []
        ys, xs = np.where(m & ~seen)
        for sy, sx in zip(ys, xs):  # BFS per unvisited seed
            if seen[sy, sx]:
                continue
            comp = []
            dq = deque([(sy, sx)])
            seen[sy, sx] = True
            while dq:
                y, x = dq.popleft()
                comp.append((y, x))
                if y + 1 < m.shape[0] and m[y + 1, x] and not seen[y + 1, x]: seen[y + 1, x] = True; dq.append((y + 1, x))
                if y > 0 and m[y - 1, x] and not seen[y - 1, x]: seen[y - 1, x] = True; dq.append((y - 1, x))
                if x + 1 < m.shape[1] and m[y, x + 1] and not seen[y, x + 1]: seen[y, x + 1] = True; dq.append((y, x + 1))
                if x > 0 and m[y, x - 1] and not seen[y, x - 1]: seen[y, x - 1] = True; dq.append((y, x - 1))
            blobs.append(comp)
        if not blobs:
            continue
        big = max(blobs, key=len)
        for y, x in big:
            out[y, x0 + x] = True
    return out


def fix_flare(path):
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    bh = bg_hue(rgb)
    hsv = rgb2hsv_np(rgb)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    dh = np.minimum(np.abs(h - bh), 1 - np.abs(h - bh))
    bg = (dh < 0.12) & (s < 0.40) & (v > 0.60)          # pink-family wash only; red flame keeps s>0.5
    kill = flood_from_edges(bg) | panel_seed(bg)
    a = np.where(kill, 0, 255).astype(np.uint8)
    a = np.asarray(Image.fromarray(a).filter(ImageFilter.GaussianBlur(0.8)))  # soften 1px seam
    out = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), a])
    Image.fromarray(out, "RGBA").save(path)
    print(f"flare1944 fixed: bg_h={bh:.3f} killed {kill.mean():.1%}")


def fix_frost(path):
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    bh = bg_hue(rgb)
    hsv = rgb2hsv_np(rgb)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    dh = np.minimum(np.abs(h - bh), 1 - np.abs(h - bh))
    base = (dh < 0.10) & (s > 0.15) & (v > 0.30) & (rgb[..., 0] > rgb[..., 2] * 0.72)  # warm pinks/purples only
    purple = (dh < 0.16) & (s > 0.20) & (v <= 0.60)                                    # dark purple shadow cast
    softp = (dh < 0.16) & (dh > 0.105) & (s > 0.25) & (v > 0.60)                       # spill band around panels
    kill = flood_from_edges(base) | purple | softp
    a = np.where(kill, 0, 255).astype(np.uint8)
    a = np.asarray(Image.fromarray(a).filter(ImageFilter.GaussianBlur(1.0)))
    # cool surviving vapor wisps: pink tint -> icy blue-grey
    hz, s2, v2 = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    tint = (dh < 0.20) & (s2 > 0.10) & (s2 < 0.45) & (a > 100)
    rgb2 = rgb.copy()
    rgb2[..., 0] = np.where(tint, rgb[..., 0] * 0.74, rgb[..., 0])
    rgb2[..., 1] = np.where(tint, rgb[..., 1] * 1.06, rgb[..., 1])
    rgb2[..., 2] = np.where(tint, np.minimum(255, rgb[..., 2] * 1.06), rgb[..., 2])
    out = np.dstack([np.clip(rgb2, 0, 255).astype(np.uint8), a])
    Image.fromarray(out, "RGBA").save(path)
    print(f"frost1999 fixed: bg_h={bh:.3f} killed {kill.mean():.1%} tinted {tint.mean():.1%}")


def fix_pose_reach(path):
    """Clear the saturated pink scrap at top-right of pose_arthur_tua_reach
    (island enclosed by nothing, flood_key keeps it; blush faces stay untouched:
    restricted to the empty corner zone)."""
    im = Image.open(path).convert("RGBA")
    arr = np.asarray(im).astype(np.float32)
    rgb = arr[..., :3]
    bh = bg_hue(rgb)
    hsv = rgb2hsv_np(rgb)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    dh = np.minimum(np.abs(h - bh), 1 - np.abs(h - bh))
    H, W = h.shape
    zone = np.zeros((H, W), bool); zone[: int(H * 0.20), int(W * 0.88):] = True
    kill = zone & (dh < 0.18) & (v > 0.45)
    rgb = np.where(kill[..., None], 255.0, rgb); rgb[..., 1][kill] = 0  # cat mejentra penuh -> dimakan mag_strict flood_key
    arr[..., :3] = rgb
    arr[..., 3] = np.where(kill, 0, arr[..., 3])
    Image.fromarray(arr.astype(np.uint8), "RGBA").save(path)
    print(f"pose_arthur_tua_reach fixed: corner pink killed {int(kill.sum())}px")


def qc(pid):
    """Remount: keyed strip over checkerboard, one JPEG per raw panel."""
    from build_props import proc  # rebuild strip + default QC
    proc(pid)
    im = np.asarray(Image.open(RAW / f"{pid}.png").convert("RGBA"))
    W3 = im.shape[1] // 3
    for k in range(3):
        f = Image.fromarray(im[:, k * W3:(k + 1) * W3 if k < 2 else im.shape[1]])
        W, H = f.size
        bg = Image.new("RGBA", (W, H), (64, 64, 72, 255))
        d = ImageDraw.Draw(bg)
        for y in range(0, H, 20):
            for x in range(0, W, 20):
                if (x // 20 + y // 20) % 2 == 0:
                    d.rectangle([x, y, x + 19, y + 19], fill=(86, 86, 98, 255))
        bg.alpha_composite(f)
        bg.convert("RGB").save(RAW / f"{pid}_fixkey_p{k}.jpg", quality=90)
    print(f"fixkey QC {pid}_fixkey_p0..2.jpg")


if __name__ == "__main__":
    ids = sys.argv[1:] or ["flare1944", "frost1999"]
    for pid in ids:
        if pid == "flare1944":
            fix_flare(RAW / f"{pid}.png")
            qc(pid)
        elif pid == "frost1999":
            fix_frost(RAW / f"{pid}.png")
            qc(pid)
        elif pid == "pose_reach":
            fix_pose_reach(Path("assets/gen/poses/pose_arthur_tua_reach.png"))
            import subprocess
            subprocess.run([sys.executable, "scripts/build_extra.py", "poses"], check=True)
