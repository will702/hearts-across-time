# 007 — Repair 1999: Mid Parallax + Far Bersih + Fix Audio/FG

| Severity | Status |
|---|---|
| MEDIUM | DONE |

Konteks: review diff v4 oleh **GLM (pi → zai/glm-5.2)** + QA visual menemukan sisa pekerjaan:
404 `assets/art/backgrounds/bg1999_mid.png` (manifest sudah menunjuk; file belum pernah dibuat — di 006 sengaja
ditunda karena kapsul 1999 tetap prosedural), `assets/art/backgrounds/bg1999_far.png` menyimpan bercak mauve +
fringe magenta di tepi tile (terlihat in-game sebagai coretan merah mengambang), dan tiga bug kecil.

Toolchain pembuatan (sesuai permintaan): **agy CLI** mengendarai generasi gambar, **GLM via `pi`**
me-review diff, **pi zai-vision MCP** memberi second-opinion screenshot; kunci baru Alibaba
(`DASHSCOPE_API_KEY` di `.env`) untuk backend WanX.

## Perubahan

- `assets/art/backgrounds/bg1999_mid.png` BARU (1920×300, parallax .45): catwalk + tangki + konsol bercahaya cyan +
  kabel gantung + embun beku di garis lantai — **tanpa kapsul** (centerpiece 1999 tetap
  prosedural-animasi). Pipeline: raw via `scripts/gen_image.py` (OpenRouter
  `gemini-3.1-flash-image-preview`, digerakkan `agy` CLI) → wipe magenta global (hue-match tanpa
  konektivitas — `flood_key` saja melewatkan kantong magenta di antara palang reli) →
  `bgprep --maxh 300 --depink 0 --blend .12` → geser hue mist/violet ke cyan dingin (h→0.56, s×.45).
  WanX DashScope (`wan2.1-t2i-turbo`) dicoba 3× lewat agy (v2–v4) — tak cocok gaya
  (perspektif tajam/palet cerah/tanpa magenta) → fallback sesuai rencana.
- `assets/art/backgrounds/bg1999_far.png` DIBANGUN ULANG dari `assets/gen/bg/bg1999_far.png`: crop margin bermasalah,
  mirror-extend tepi dgn cross-fade 40px di sambungan (proporsi & tinggi asli tetap), buang bercak +
  fringe; seam tile mulus (QC `pair` 0 kolom pink). Flood_key dilewati manual — kanvas tanpa magenta
  membuat estimator hue-nya menelan subjek.
- `scripts/gen_image_ds.py` BARU: klien t2i Alibaba DashScope (async poll, endpoint intl,
  model default `wan2.1-t2i-turbo`; baca `DASHSCOPE_API_KEY` dari env/`.env` ala `gen_image.py`).
- `index.html` (3 fix): filter langkah 1968 ikut rute (`S.routeB1` → bunker bandpass 820 /
  lab bandpass 1500; sebelumnya selalu fallback `highpass,900`); `SFX.flip` di-throttle 0.22 dtk
  (sebelumnya spam ~14/dtk saat fast-forward); endcard kini menggambar `bg1999_fg` (fallback
  siluet) — dulu occluder foreground hilang pop saat masuk endcard.

## QA

- `qa/vh_shots.js` (golden + fail route): **NO CONSOLE/PAGE ERRORS** — 404 hilang; semua shot
  termasuk pose & endcard terambil.
- Second opinion pi zai-vision MCP pada shot 1999: pass.
- pindaian kolom pink di semua `assets/bg*(far|mid|near|fg).png`: bersih (0 kolom).
