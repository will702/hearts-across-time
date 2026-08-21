#!/usr/bin/env python3
"""Asset post-processing for Hearts Across Time.

Subcommands:
  key      IN.png OUT.png [--color magenta|white]   chroma/luma key -> RGBA
  cell     IN.png OUT.png [--h 192]                 trim, scale, anchor to 150x210 cell
  compose  SPEC.json OUT.png                        build 4x8 (150x210) sheet from cells
  bgprep   IN.png OUT.png --maxh N [--color white]  key, seam-blend edges, cap height
  pair     IN.png OUT.png                           tile image 2x side by side (QC seams)
"""
import argparse, json, sys
from pathlib import Path

import numpy as np
from PIL import Image

CELL_W, CELL_H = 150, 210
ANCHOR_PAD = 4  # px margin between feet and cell bottom


# ---------- keying ----------

def _soft(t0, t1, x):
    d = t1 - t0
    if abs(d) < 1e-9:
        d = 1e-9
    return np.clip((x - t0) / d, 0.0, 1.0)


def _rgb2hsv(rgb):
    """rgb float32 HxWx3 in 0..255 -> hsv HxWx3 (h 0..1, s 0..1, v 0..1)."""
    import colorsys
    flat = (rgb / 255.0).reshape(-1, 3)
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in flat])
    return hsv.reshape(rgb.shape)


def key_image(img: Image.Image, mode: str) -> Image.Image:
    """Return RGBA image with background keyed out."""
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if mode == "magenta":  # hue key, bg hue estimated from corners (model varies)
        hsv = _rgb2hsv(rgb)
        h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
        w = 60
        corner_h = np.concatenate([h[:w, :w].ravel(), h[:w, -w:].ravel(),
                                   h[-w:, :w].ravel(), h[-w:, -w:].ravel()])
        corner_s = np.concatenate([s[:w, :w].ravel(), s[:w, -w:].ravel(),
                                   s[-w:, :w].ravel(), s[-w:, -w:].ravel()])
        bg_h = float(np.median(corner_h[corner_s > 0.25])) if (corner_s > 0.25).any() else 0.86
        dh = np.abs(h - bg_h)
        dh = np.minimum(dh, 1 - dh)  # wrap
        hue_far = _soft(0.030, 0.085, dh)          # 1 = far from bg hue
        sat_low = _soft(0.42, 0.22, s)             # 1 = clearly unsaturated
        dark = _soft(0.55, 0.40, v)              # dark ink lines are subject
        a = np.maximum(np.maximum(hue_far, sat_low), dark)
        # despill edge pixels toward neutral (magenta bounce)
        edge = (a > 0.05) & (a < 0.95) & (dh < 0.12)
        gray = rgb.mean(axis=2)
        for i in range(3):
            rgb[..., i] = np.where(edge, 0.60 * rgb[..., i] + 0.40 * gray, rgb[..., i])
    elif mode == "white":  # luminance key: white paper -> transparent
        luma = 0.299 * r + 0.587 * g + 0.114 * b
        a = _soft(238, 205, 255 - luma)  # darker ink/paint -> opaque
        # premultiply-safe: keep color, alpha carries density
    else:
        raise SystemExit(f"unknown key color: {mode}")
    alpha = (a * 255).astype(np.uint8)
    # erode 1px of fully-bg ring to kill halos, keep soft interior
    k = alpha < 24
    alpha[k] = 0
    out = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha])
    return Image.fromarray(out, "RGBA")


def flood_key(img: Image.Image) -> Image.Image:
    """Background-safe keying: remove only magenta Edge-connected via flood fill,
    so interior pinkish watercolor washes survive. Wall tiles (no magenta) pass through untouched."""
    from collections import deque
    from PIL import ImageFilter
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    hsv = _rgb2hsv(rgb)
    h, s = hsv[..., 0], hsv[..., 1]
    w = 60
    ch = np.concatenate([h[:w, :w].ravel(), h[:w, -w:].ravel(), h[-w:, :w].ravel(), h[-w:, -w:].ravel()])
    cs = np.concatenate([s[:w, :w].ravel(), s[:w, -w:].ravel(), s[-w:, :w].ravel(), s[-w:, -w:].ravel()])
    bg_h = float(np.median(ch[cs > 0.25])) if (cs > 0.25).any() else 0.86
    dh = np.minimum(np.abs(h - bg_h), 1 - np.abs(h - bg_h))
    mag = (dh < 0.055) & (s > 0.30)
    Hh, Ww = mag.shape
    seen = np.zeros_like(mag)
    dq = deque()
    for x in range(Ww):
        for y in (0, Hh - 1):
            if mag[y, x] and not seen[y, x]:
                seen[y, x] = True
                dq.append((y, x))
    for y in range(Hh):
        for x in (0, Ww - 1):
            if mag[y, x] and not seen[y, x]:
                seen[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        if y + 1 < Hh and mag[y + 1, x] and not seen[y + 1, x]: seen[y + 1, x] = True; dq.append((y + 1, x))
        if y > 0 and mag[y - 1, x] and not seen[y - 1, x]: seen[y - 1, x] = True; dq.append((y - 1, x))
        if x + 1 < Ww and mag[y, x + 1] and not seen[y, x + 1]: seen[y, x + 1] = True; dq.append((y, x + 1))
        if x > 0 and mag[y, x - 1] and not seen[y, x - 1]: seen[y, x - 1] = True; dq.append((y, x - 1))
    # strict magenta also counts as bg: catches saturated slivers enclosed by content
    mag_strict = (dh < 0.05) & (s > 0.42)
    seen |= mag_strict
    alpha = np.where(seen, 0, 255).astype(np.uint8)
    # erode subject 2px to consume the antialiased magenta fringe, then soft feather
    a_img = Image.fromarray(alpha).filter(ImageFilter.MinFilter(5))
    a = a_img.filter(ImageFilter.GaussianBlur(1.2))
    # despill near-boundary pixels: pull magenta cast toward neutral
    aa = np.asarray(a).astype(np.float32) / 255.0
    edge = (aa > 0.05) & (aa < 0.9) & (dh < 0.10) & (s > 0.18)
    luma = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2])
    for i in range(3):
        rgb[..., i] = np.where(edge, 0.40 * rgb[..., i] + 0.60 * luma, rgb[..., i])
    out = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), np.asarray(a)])
    return Image.fromarray(out, "RGBA")


def alpha_bbox(im: Image.Image):
    a = np.asarray(im)[..., 3]
    ys, xs = np.where(a > 24)
    if len(xs) == 0:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def trim(im: Image.Image, pad=2) -> Image.Image:
    bb = alpha_bbox(im)
    if not bb:
        return im
    x0, y0, x1, y1 = bb
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(im.width, x1 + pad), min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


# ---------- sprite cells / sheet ----------

def anchor_cell(im: Image.Image, target_h=192) -> Image.Image:
    """Scale char to target height, paste bottom-center into a 150x210 cell."""
    im = trim(im.convert("RGBA"))
    if im.height == 0:
        raise SystemExit("empty subject after keying")
    s = target_h / im.height
    nw, nh = max(1, round(im.width * s)), target_h
    if nw > CELL_W - 8:  # too wide -> rescale to fit width
        s = (CELL_W - 8) / im.width
        nw, nh = CELL_W - 8, max(1, round(im.height * s))
    im = im.resize((nw, nh), Image.LANCZOS)
    cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    x = (CELL_W - nw) // 2
    y = CELL_H - ANCHOR_PAD - nh
    cell.alpha_composite(im, (x, y))
    return cell


def compose(spec_path: str, out_path: str):
    """SPEC: {"rows": [[cell0..cellN] x8], "cols": 4|6} of RGBA png paths ("" = skip).
    cols=6 -> kolom F4/F5 = frame bicara (mulut tertutup/terbuka)."""
    spec = json.loads(Path(spec_path).read_text())
    rows = spec["rows"]
    cols = int(spec.get("cols", 4))
    sheet = Image.new("RGBA", (CELL_W * cols, CELL_H * 8), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        for cidx, p in enumerate(row):
            if not p:
                continue
            sheet.alpha_composite(Image.open(p).convert("RGBA"),
                                  (cidx * CELL_W, r * CELL_H))
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)
    print(f"sheet {out_path} {sheet.size}")


# ---------- backgrounds ----------

def seam_blend(im: Image.Image, frac=0.12) -> Image.Image:
    """Seamless horizontal tile: crossfade tepi kiri<->kanan LALU ramp koreksi
    supaya kolom 0 == kolom w-1 persis (junction ditutup, bukan cuma dihaluskan)."""
    arr = np.asarray(im.convert("RGBA")).astype(np.float32)
    h, w = arr.shape[:2]
    bw = max(8, int(w * frac))
    t = 0.5 * (1 - np.cos(np.pi * (np.arange(bw) + 0.5) / bw))  # smooth 0..1 (pusat piksel)
    t = t[None, :, None]
    left = arr[:, :bw].copy()
    right = arr[:, w - bw:].copy()
    arr[:, :bw] = left * t + right * (1 - t)        # kolom 0 mewarisi konten tepi kanan
    arr[:, w - bw:] = right * t + left * (1 - t)    # kolom w-1 mewarisi konten tepi kiri
    # ramp koreksi residual: kolom 0 digeser persis ke kolom w-1 dalam 24px
    jw = min(24, bw)
    delta = arr[:, 0] - arr[:, w - 1]
    ramp = (1 - np.arange(jw) / jw)[None, :, None]
    arr[:, :jw] -= delta[:, None, :] * ramp
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def _hsv2rgb(h, s, v):
    """Vectorized hsv (0..1) -> rgb (0..255 float)."""
    i = np.floor(h * 6).astype(np.int32) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    r = np.choose(i, [v, q, p, p, t, v])
    g = np.choose(i, [t, v, v, q, p, p])
    b = np.choose(i, [p, p, t, v, v, q])
    return np.dstack([r, g, b]) * 255.0


def depink_hues(im: Image.Image, strength: float) -> Image.Image:
    """Rotate magenta/rose family hues toward muted umber; keeps other hues intact."""
    arr = np.asarray(im.convert("RGBA")).astype(np.float32)
    rgb, a = arr[..., :3], arr[..., 3]
    hsv = _rgb2hsv(rgb)
    h, s_, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    m = (h > 0.74) & (s_ > 0.05) & (a > 40)
    delta = (0.05 - h + 1) % 1.0          # rotate forward through red, never across cyan
    h2 = np.where(m, (h + delta * strength) % 1.0, h)
    s2 = np.where(m, s_ * (1 - 0.45 * strength), s_)
    rgb2 = _hsv2rgb(h2, s2, v)
    arr[..., :3] = np.where(m[..., None], rgb2, rgb)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def seal_bottom(im: Image.Image, band=48) -> Image.Image:
    """For each column with opaque pixels inside the bottom `band` rows,
    fill everything below the lowest opaque pixel with its color.
    Guarantees ground-contact strips never show sky through the baseline."""
    arr = np.asarray(im.convert("RGBA")).copy()
    h, w = arr.shape[:2]
    a = arr[..., 3]
    opq = a > 24
    has = opq[h - band:].any(axis=0)
    for x in np.where(has)[0]:
        yb = int(np.where(opq[:, x])[0].max())
        if yb >= h - 1:
            continue
        fill = arr[yb, x].copy()
        fill[3] = 255
        arr[yb + 1:, x] = fill
    return Image.fromarray(arr, "RGBA")


def bgprep(inp, out, maxh: int, colormode: str, blend: float, width: int, fadetop: float, croptop: float, cropx: float, depink: float):
    im = Image.open(inp).convert("RGB")
    im = flood_key(im) if colormode == "magenta" else key_image(im, colormode)
    im = trim(im, pad=0)
    if croptop > 0:
        im = im.crop((0, int(im.height * croptop), im.width, im.height))
    if cropx > 0:
        dx = int(im.width * cropx)
        im = im.crop((dx, 0, im.width - dx, im.height))
    if depink > 0:
        im = depink_hues(im, depink)
    # cap height (keep aspect)
    if im.height > maxh:
        s = maxh / im.height
        im = im.resize((max(1, round(im.width * s)), maxh), Image.LANCZOS)
    # normalize tile width
    if im.width != width:
        s = width / im.width
        im = im.resize((width, max(1, round(im.height * s))), Image.LANCZOS)
        if im.height > maxh:  # re-cap from bottom (keep ground, crop top)
            im = im.crop((0, im.height - maxh, width, im.height))
    im = seal_bottom(im)
    if fadetop > 0:  # fade residual sky wash into transparency
        arr = np.asarray(im).astype(np.float32)
        hh = arr.shape[0]
        zone = max(1, int(hh * fadetop))
        ramp = np.clip(np.arange(hh) / zone, 0, 1)[:, None]
        arr[..., 3] *= ramp
        im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    im = seam_blend(im, blend)
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    im.save(out)
    print(f"bg {out} {im.size}")


def pair(inp: str, out: str):
    im = Image.open(inp).convert("RGBA")
    canvas = Image.new("RGBA", (im.width * 2, im.height), (40, 40, 40, 255))
    canvas.alpha_composite(im, (0, 0))
    canvas.alpha_composite(im, (im.width, 0))
    canvas.save(out)
    print(f"qc pair {out}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["key", "cell", "compose", "bgprep", "pair"])
    ap.add_argument("inp")
    ap.add_argument("out")
    ap.add_argument("--color", default="magenta", choices=["magenta", "white"])
    ap.add_argument("--h", type=int, default=192)
    ap.add_argument("--maxh", type=int, default=420)
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--blend", type=float, default=0.12)
    ap.add_argument("--fadetop", type=float, default=0.0)
    ap.add_argument("--croptop", type=float, default=0.0)
    ap.add_argument("--cropx", type=float, default=0.0)
    ap.add_argument("--depink", type=float, default=0.0)
    ap.add_argument("--flip", action="store_true", help="mirror horizontally (art faces left -> right)")
    a = ap.parse_args()
    if a.cmd == "key":
        key_image(Image.open(a.inp), a.color).save(a.out)
        print(f"keyed {a.out}")
    elif a.cmd == "cell":
        im = key_image(Image.open(a.inp), a.color)
        if a.flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        anchor_cell(im, a.h).save(a.out)
        print(f"cell {a.out}")
    elif a.cmd == "compose":
        compose(a.inp, a.out)
    elif a.cmd == "bgprep":
        bgprep(a.inp, a.out, a.maxh, a.color, a.blend, a.width, a.fadetop, a.croptop, a.cropx, a.depink)
    elif a.cmd == "pair":
        pair(a.inp, a.out)


if __name__ == "__main__":
    main()
