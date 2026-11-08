# 006 — Asset-Rich & Alive Pass

| Severity | Status |
|---|---|
| MEDIUM | DONE |

Goal: game lebih *asset-rich* dan hidup — properti animasi, cuaca, latar lebih dalam,
animasi/pose karakter, audio ambience & SFX — dengan sumber campuran: **gambar via pipeline
AI in-repo (OpenRouter)**, **audio via download CC0**. Tanpa Blender (pipeline 3D tak cocok
untuk game 2D cat-air di Canvas).

## Aset baru (≈22 panggilan gambar AI, sekali jalan)

- `assets/prop_*.png` ×9 — strip animasi 3-frame 200px (sel tengah-bawah): bendera lusuh &
  lentera (1944), tong api & poster robek (2088), bohlam goyang & radio (1968A), beacon & uap
  pipa (1968B), CRT osiloskop (1999). Pipeline baru: `scripts/gen_props.py` (1 gambar = strip
  3 frame di magenta) → `scripts/build_props.py` (flood_key → slice → anchor → QC).
  **Temuan pipeline: prompt "strip 3 frame berdampingan" berfungsi baik — 1 panggilan/prop,
  tak perlu rantai edit per-frame.**
- `assets/bg<era>_fg.png` ×5 — lapisan foreground lukis 1920×260 (gen: `scripts/gen_extra.py fg`;
  proses: `scripts/build_extra.py` — bgprep `--depink 1.0 --blend 0.25` + `darken()` ke siluet
  gelap; alasan: flood_key menyisakan bercak magenta pada sumber AI → siluetkan, bukan repair hue).
- `assets/pose_*.png` ×3 (gen edit-mode ber-referensi sel netral): `pose_elena_hold`
  (node `c1e`/`c2e`), `pose_elena_kneel` (`true_end` + endcard), `pose_arthur_tua_reach`
  (`n_b3` saat line tua berekspresi warm/happy).
- `assets/audio/*.wav` ×12 — **CC0**: Kenney RPG Audio `footstep00/03/05/08`, `bookFlip1/2`,
  `metalClick`, `creak2`; loop OpenGameArt: `rain` (AMB Rain Loop 1, Kresiek The Furry),
  `wind` (wind1, Luke.RUSTLTD), `fire` (Fireplace Sound loop, PagDev), `hum` (Generator loop,
  YCbCr) — ditrim ≤13 dtk + fade mikro, WAV mono 44.1k (kompat-browser & loop mulus; lewati
  OGG karena libvorbis tak ada & MP3 menyisakan gap).

## Integrasi kode (`index.html`)

- `ASSET_MANIFEST` +22 entri (props/fw200, fg/h, pose/h); `AUDIO_MANIFEST` + `AMB_LAYER` per era.
- `AU.bufs` + `loadAudioBufs()` (fetch+decode, malas pasca gesture; loop amb yang terlambat
  datang dipasang saat era aktif), `playSfxBuf()` (acak varian + rate-jitter + filter per
  permukaan lumpur/beton/metal), `ambBufLoop()` lewat `ambNode` (kompatibel `stopAmb`).
- `SFX.step` → sampel Kenney (fallback noise); `SFX.flip` rustle kertas di tiap `say`.
- `PROPS` registry + `drawPropFrame`/`drawProps` (deterministik `T*fps`, reduceMotion → frame 0);
  digambar di `drawScene` setelah bg, juga di sampul & prolog 2088.
- `bgFgImg()` parallax ×1.18 menggantikan `fgSilhouette` bila file ada (fallback tetap jalan).
- Gerimis 1944 prosedural: streak miring cepat + riak elips pecah di tanah (tipe partikel
  `line`/`ring` baru di `drawParts`), hormati reduceMotion.
- Tarikan napas idle ±1.1px (fase beda Elena/Arthur) di `drawChars`; `POSES` map + `drawPoseImage`
  override per node, + pose berlutut di endcard.

## QA

`qa/vh_shots.js` diperluas: hitung `AU.bufs` (12/12 termuat), shot pose empati/reach/kneel,
semua adegan golden+fail — 0 console/page error tersisa (404 `bg1999_mid.png` pra-eksis &
sengaja: kapsul 1999 prosedural).
