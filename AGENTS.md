# AGENTS.md — Hearts Across Time — Break The Loop

Panduan untuk agen coding yang bekerja di repo ini. Dokumen lain yang wajib dibaca:
`README.md` (implementasi vs GDD, aset, audio, VFX), `FIKS IDE.md` (GDD + skrip dialog Yarn
sumber), dan `plans/README.md` (riwayat pass perbaikan 001–009).

## 1. Gambaran Proyek

Game naratif 2D side-scroller *psychological time-loop* untuk **COMPFEST Indie Game Jam**.
Canvas 960×540, **satu file `index.html` saja** (~1.700 baris) berisi seluruh game: engine,
state machine, dialog, audio prosedural WebAudio, dan renderer Canvas 2D. **Tidak ada build
step, bundler, atau framework JS.** Kode di dalam `index.html` memuat game penuh (ini file
belum dimuat di sesi ini — navigasi dengan grep untuk menemukan lokasi fungsi).

Alur cerita (mirror dari skrip Yarn di `FIKS IDE.md`): state `load → title → prologue →
walk → dialog → vortex → glitch → endcard`. Sistem kepribadian tersembunyi (Empati vs
Logika, **direset tiap loop**) menentukan kepribadian Arthur; percabangan 2→4→8; True
Ending = Empati tinggi → rute 1B → 2B2 → pilihan "Ikhlas". Progres (ending terungkap n/6,
titik lore, opsi) tersimpan di `localStorage`.

## 2. Menjalankan & Deploy

- **Jalankan:** buka `index.html` langsung di browser, atau `python -m http.server 8777`.
  Font Patrick Hand diblokir CORS di `file://` → fallback mulus ke Trebuchet (memang didesain).
- **Deploy itch.io:** zip `index.html` + `assets/` (bukan satu file lagi). `index.html.zip`
  di repo sudah usang — jangan dijadikan referensi.
- **POC migrasi Phaser:** `phaser-demo.html` (Phaser 4 dari `vendor/phaser.min.js`, sajikan
  via server lokal) — cuma proof-of-concept; **game utama tetap Canvas murni, jangan
  dimigrasi tanpa instruksi eksplisit.** README punya peta migrasi bila kelak diperlukan.

## 3. Struktur Repo

| Path | Isi |
|---|---|
| `index.html` | Seluruh game (mesin + isi). Satu `<script>` dengan banner seksi. |
| `FIKS IDE.md` | GDD & skrip dialog Yarn asli (sumber kebenaran cerita/cabang). |
| `README.md` | Dokumentasi utama (fitur, manifest aset, audio, VFX). |
| `phaser-demo.html` | POC Phaser (bukan game). |
| `assets/` | PNG lukis: sheet karakter, latar parallax `bg<era>_<layer>.png`, `prop_*.png` (strip 3 frame), `pose_*.png`, `*_TEMPLATE.png` (referensi proporsi), `fonts/`, `audio/` (CC0). |
| `assets/gen/` | Bahan mentah hasil generate (di-gitignore, tapi sering ada secara lokal). |
| `scripts/` | Pipeline aset Python (lihat §5). |
| `qa/` | Skrip QA Playwright + screenshot hasil (di-gitignore — tidak untuk dicommit). |
| `qa/fallback/index.html` | Salinan game versi fallback prosedural (uji tanpa aset). |
| `vendor/phaser.min.js` | Phaser v4.2.1 vendored, **belum dipakai**. |
| `node_modules/` | Hanya Playwright 1.62.1 (tanpa `package.json`; dipasang ad-hoc). |
| `.venv/` | Python venv: `requests pillow numpy`. |
| `.env` | API key pipeline aset (gitignored — lihat §7). |

Tidak ada `package.json`, `pyproject.toml`, atau manifest dependensi apa pun. Dependensi
dikelola manual: JS = vendor tunggal; Python = `.venv`; Node = Playwright lokal.

## 4. Arsitektur Kode (`index.html`)

Seksi-seksi utama (cari banner `/* ---` / `/* ===`):

- **Konstan & util:** `W=960, H=540, GROUND=444`; helper `clamp/lerp/easeIO/easeOB/mulberry32`
  (rand seeded untuk parallax deterministik).
- **`ASSET_MANIFEST` + loader `AS` / `drawCharSheet` / `bgLayerImg`:** lapisan aset opsional —
  PNG absen → fallback menggambar prosedural, jadi seluruh game jalan tanpa `assets/`.
  Sheet karakter = grid **4 kolom × 8 baris sel 150×210** (F0 idle, F1–F3 siklus jalan;
  baris `EXPR_ROWS = neutral, smile, sad, shock, angry, mad, warm, happy`), jangkar
  tengah-bawah, tinggi tampil default 112px.
- **`drawElena` / `drawArthur` / `bg1944…bg2088`:** sprite & parallax prosedural (fallback).
- **`NODES`:** seluruh dialog & percabangan, migrasi verbatim dari `FIKS IDE.md`, plus varian
  déjà-vu sadar-loop. Jangan menyunting cerita tanpa mengecek konsistensi dengan GDD.
- **`SONGS/MUS`, `SFX`, `setAmbience/setSong/duckMusic`:** musik leitmotif sequencer WebAudio
  real-time (bus `master → limiter`; sub-bus SFX/Ambience/Musik; reverb+feedback-delay untuk
  musik; ducking saat teks mengetik). Audio CC0 eksternal (`assets/audio/`) dimuat malas —
  absen = senyap, bukan error.
- **`update/render`:** state machine (`G.state`); variabel global penting: `G` (game state),
  `S` (run state: empathy/logic/route), `D` (dialog aktif), `T` (waktu global detik),
  `OPTS` (volume/teks/reduceMotion).

## 5. Pipeline Aset (`scripts/`, Python 3 di `.venv`)

Urutan umum: **generate (API) → key/cell/bgprep → compose → hasil di `assets/`**.
Bahan mentah ke `assets/gen/` (gitignored). Skrip orchestrator memanggil `build_sheets.py`
sebagai subproses.

- `gen_image.py` — klien OpenRouter (`google/gemini-3.1-flash-image-preview`,
  `OPENROUTER_API_KEY`; ada `--max-tokens` untuk key berkredit). Backend favorit (gaya watercolor).
- `gen_image_ds.py` — alternatif DashScope/WanX (`DASHSCOPE_API_KEY`); gaya lebih kartun,
  hanya dipakai bila jalur Gemini tak tersedia.
- `build_sheets.py` — util inti, subcommand: `key` (chroma-key magenta dgn estimasi hue +
  flood-fill / luma white), `cell` (trim+re-anchor kaki ke sel 150×210), `compose` (spec JSON
  → sheet 4×8), `bgprep` (key + seam-blend + cap tinggi + `seal_bottom` + `depink`), `pair`
  (QC montage tile 2× untuk cek jahitan).
- `compose_all.py` — membangun kelima `assets/<id>_sheet.png` sekaligus (perhatikan flag
  `--flip`: semua Arthur di-flip, Elena tidak — engine meng-mirror Arthur).
- `gen_exprs.py`, `gen_bgs.py`, `gen_props.py`, `gen_extra.py` — generator batch (ekspresi,
  latar, properti, ekstra) yang memanggil klien API.
- `build_props.py`, `build_extra.py` — post-proses strip properti/pose/fg.
- `fix_props_key.py` — perbaikan ulang keying properti yang bocor pink.

Konvensi seni: gaya watercolor-storybook (garis pensil grafit + wash muted), latar harus
**tile horizontal seamless**, jangkar bawah; karakter menghadap kanan di sheet.

## 6. QA / Testing

Tidak ada unit test framework — QA = **Playwright headless + screenshot + zero-error console**:

```
python -m http.server 8777 &          # skrip menargetkan http://127.0.0.1:8777/index.html
NODE_PATH=$(pwd)/node_modules node qa/route.cjs golden   # rute True Ending penuh
NODE_PATH=$(pwd)/node_modules node qa/route.cjs failA    # rute collapse → glitch loop
NODE_PATH=$(pwd)/node_modules node qa/shoot.cjs early    # screenshot cepat awal game
```

Catatan header skrip menyebut `NODE_PATH=/opt/homebrew/lib/node_modules` (Playwright global) —
`node_modules/` lokal kini juga ada, jadi dua-duanya bisa. `qa/route.cjs` menerima prefix
opsional arg ketiga untuk nama file screenshot. Skrip meng-klik rute penuh (prologue →
dialog → pilihan → dua era jalan → ending) dan **gagal bila ada `pageerror`/console error**
atau state tak mencapai target. Hasil ditulis sebagai PNG ke `qa/` (gitignored). Alur
kerja menambah fitur: tambahkan tembakan/asersi di skrip QA terkait, jalankan rute golden +
failA, periksa screenshot akhir secara visual.

## 7. Keamanan & Git

- `.env` berisi `OPENROUTER_API_KEY` + `DASHSCOPE_API_KEY` — **gitignored, jangan pernah
  commit/echo/cetak.** Skrip membaca key dari env atau `.env` terdekat ke atas.
- `.gitignore`: `.DS_Store, node_modules/, .refs/, *.log, .env, .venv/, assets/gen/, qa/, __pycache__/, *.pyc`.
- Screenshot QA dan bahan mentah generate tidak masuk repo; hasil olahan di `assets/` dicommit.
- Pesan commit: **Conventional Commits bahasa Inggris** (riwayat: `feat: …`, `chore: …`),
  satu pass perubahan per commit.
- Audio di `assets/audio/` berlisensi CC0 (Kenney, OpenGameArt) — pertahankan kredit di README.
- Font `assets/fonts/patrick-hand*.woff2` SIL OFL — subset via `FontFace`, jangan dihapus
  (fallback Trebuchet mengcover `file://`).

## 8. Konvensi Kode

- **Bahasa:** komentar kode `index.html` campuran Indonesia/Inggris; semua teks in-game &
  dokumentasi **Bahasa Indonesia**. Pertahankan.
- **Satu file:** semua kode game masuk `index.html` — jangan pecah ke modul/ESM.
- Gaya JS sangat padat: satu ekspresi per titik-koma, nama singkat (`G`, `S`, `D`, `T`,
  `W`, `H`), tanpa semicolon-lebar/formatter; ikuti idiom file, jangan reformat massal.
- Angka ajaib dikalibrasi sebagai konstanta di dekat penggunaan (fisika jalan, parallax
  factor, palet `PAL`); pakai `mulberry32` untuk apapun yang harus deterministik antar-frame.
- Setiap fitur visual baru wajib terus bekerja dengan **fallback prosedural** bila PNG absen
  (cek `AS.imgs[id]` / `im.width` sebelum gambar), dan hormati `reduceMotion`.
- Perubahan cerita/dialog: edit `NODES` di `index.html`; `FIKS IDE.md` adalah GDD referensi —
  sinkronkan bila struktur cabang berubah, dan uji kedua rute (`golden` dan `failA`).
- Perubahan pipeline aset: uji dengan `build_sheets.py` subcommand langsung; jangan
  regenerate sedangkan game sedang diverifikasi dari PNG yang ada.
- Sebelum selesai menambah fitur, pastikan: rute golden & failA lolos tanpa error, screenshot
  akhir benar, dan README/`plans/` diperbarui bila konvensinya berubah.
