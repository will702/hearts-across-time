# ⏳ Hearts Across Time — Break The Loop

> 2D Side-Scroller Narrative Puzzle / Psychological Time-Loop • Phaser 4 + Canvas 2D
> Dibangun untuk **COMPFEST Indie Game Jam** — implementasi penuh dari *Game Design Document* `FIKS IDE.md`.

## ▶ Cara Menjalankan

Tidak butuh build step. Jalankan lewat server lokal agar modul dan font dimuat konsisten:

```
python -m http.server 8777
# buka http://127.0.0.1:8777/index.html
```

Untuk deploy itch.io, zip `index.html`, `src/`, `vendor/`, dan `assets/`, lalu upload sebagai **HTML5 game** (960×540, scale to fit).

## 🎮 Kontrol

| Aksi | Keyboard | Sentuh |
|---|---|---|
| Bergerak | `← →` atau `A D` (lari: `Shift`) | tombol ◀ ▶ (lari: tahan ≫) |
| Lanjut dialog | `Enter` / `Space` / klik | ketuk layar |
| Pilih opsi | `↑ ↓` + `Enter`, atau tombol `1` / `2` | ketuk opsi |
| Periksa titik lore (`✦` berdenyut) | `↓` atau `S` saat berdiri dekat | ketuk penanda |
| Backlog dialog | `Tab` / `B` (gulir: `↑ ↓`) | — |
| Jeda (mixer + aksesibilitas) | `Esc` | ikon ⏸ pojok kanan atas |
| Bisu-suara | `M` | ikon 🔊 pojok kanan atas |

Mulai dari loop ke-2 Elena **berlari otomatis** — `Shift`/`≫` berbalik fungsi jadi jalan pelan, agar pengulangan siklus tidak repot. Layar judul menampilkan penghitung **⏳ ENDING TERUNGKAP n/6** (5 rute gagal + true ending) yang tersimpan lintas sesi.

## ✅ Implementasi vs GDD

| Fitur GDD | Status |
|---|---|
| Sistem Kepribadian tersembunyi (Empati vs Logika) | ✔ 2 pertanyaan sikap di Babak 1 → menentukan Arthur Hangat / Sinis di 1968 |
| Percabangan pohon waktu 2 → 4 → 8 | ✔ Rute 1A/1B × 2A1/2A2/2B1/2B2 → 4 kasus akhir + sub-kondisi |
| Looping System (`loop_count++`) | ✔ Layar glitch RGB-strip + "⟲ LOOP n", reset ke Babak 1, HUD penghitung loop |
| True Ending (Empati tinggi → B → B2 → Ikhlas) | ✔ Termasuk rahasia: statistik *hidden affinity* terungkap di kartu ending |
| Skrip Yarn Spinner | ✔ Seluruh dialog dimigrasi verbatim (node `prologue … true_end`) |
| Asset manifest (4 sprite chibi + 3 parallax + bubble) | ✔ Semua digambar **prosedural via kode** — nol aset eksternal |
| Balon kata 7-Days style | ✔ Bubble putih + ekor + chip nama (Elena merah rose / Arthur slate) |

## 🎨 Catatan Aset

Seluruh karakter & latar **sudah berupa PNG lukis asli** di `assets/` (gaya watercolor-storybook mengikuti
referensi: garis pensil grafit sketsa + wash cat air, palet muted). Digenerate dengan
`google/gemini-3.1-flash-image-preview` via OpenRouter, lalu diproses offline (chroma-key magenta w/
hue estimation + flood-fill, re-anchor kaki bottom-center, seamless tiling cross-fade) lewat skrip yang
disertakan: `scripts/gen_image.py`, `scripts/gen_exprs.py`, `scripts/gen_bgs.py`,
`scripts/build_sheets.py`, `scripts/compose_all.py` (butuh `OPENROUTER_API_KEY` di `.env` + `.venv` berisi
`requests pillow numpy` untuk regenerasi). Sejak pass 010, `seam_blend` di `build_sheets.py` menutup
junction tile secara eksak (kolom 0 == kolom w-1 + ramp koreksi 24px); PNG final era lama yang masih
berseam dapat dirapikan tanpa regenerasi lewat `scripts/fix_bg_seams.py` (cetak seamdiff sebelum/sesudah,
`--qc` untuk pasangan tile). Backend alternatif: `scripts/gen_image_ds.py` memakai
Alibaba Cloud Model Studio/DashScope (WanX t2i async; butuh `DASHSCOPE_API_KEY` di `.env`) — gaya
WanX cenderung lebih tajam/kartun dari wash cat air gemini, jadi hanya dipakai bila jalur gemini tak tersedia. Fallback prosedural tetap utuh — hapus PNG mana pun dan game
otomatis menggambarnya lagi lewat kode. Font UI **Patrick Hand** (SIL OFL) ikut di-bundle di `assets/fonts/`
(2 subset woff2, dimuat via `FontFace`); saat dibuka langsung lewat `file://` font diblokir CORS browser →
otomatis fallback ke Trebuchet tanpa error.

- Elena — rambut ash-blonde belah tengah, jas lab putih di atas gaun dusty-rose, boot kulit pucat strap gelap;
  4 frame jalan asli (sel F1–F3) + 7 variasi ekspresi
- Arthur muda (seragam medis + helm + vial hijau), dewasa (jas lab + kacamata), buron (jaket coklat + satchel),
  tua (kardigan + tongkat) — masing-masing 8 baris ekspresi konsisten satu pose
- 11 latar parallax lukis: puing 2088 (far/mid/near), parit 1944 (far/mid), bunker 1968A (far/mid),
  lab 1968B (far/mid), ruang kriogenik 1999 (far/mid). Kapsul 1999 tetap **prosedural-animasi** (gelembung,
  cairan, label ARTHUR PROJECT) — keputusan sengaja agar centerpiece tetap hidup

Sprite & latar masih bisa di-tweak: regenerasi sel lewat skrip di atas, atau tweak konstanta `PAL`
untuk fallback prosedural.

**Asset-rich pass (v4)** menambah, lewat pipeline yang sama (`scripts/gen_props.py` →
`scripts/build_props.py`, `scripts/gen_extra.py` → `scripts/build_extra.py`):

- **11 strip properti animasi** 3-frame (`assets/prop_*.png`): bendera lusuh & lentera (1944), tong api &
  poster robek (2088), bohlam bergoyang & radio (1968A), beacon & uap pipa (1968B), CRT osiloskop (1999),
  suar sinyal (1944, menandai titik lore), ventilasi embun beku (1999)
- **5 lapisan foreground lukis** `assets/bg<era>_fg.png` (okluder dekat kamera parallax ×1.18; absen →
  tetap `fgSilhouette` prosedural)
- **5 pose momen kunci** `assets/pose_*.png`: Elena menggenggam tangan (respons empati `c1e`/`c2e`),
  Elena berlutut memeluk vial (`true_end` & kartu akhir), Arthur tua meraih kapsul (`n_b3` cabang hangat),
  Arthur muda menyodorkan vial (`r1b`), Elena teguhkan hati (`n_b1` saat ekspresi marah, loop ≥3) — pose
  kini **fade-in 250ms** (bukan pop) antar node, dengan filter ekspresi opsional per node
- **Audio CC0** di `assets/audio/` (lihat kredit di bagian Musik & Audio) — langkah kaki per-permukaan,
  rustle kertas dialog, loop ambience per era (hujan / angin / bara / dengung mesin)

## 🖼 Memakai Aset PNG Buatan Sendiri (opsional, tanpa pindah engine)

Game punya **lapisan aset bawaan**: letakkan PNG di folder `assets/` dan game otomatis
memakainya. File yang tidak ada → otomatis fallback ke gambar prosedural, jadi bisa
mengganti sebagian saja (mis. cuma sprite Elena) tanpa menyentuh kode sama sekali.

### Sprite karakter — `assets/<id>_sheet.png`

Grid **4 kolom × 8 baris**, sel 150×210 px (konfigurasi di `ASSET_MANIFEST`):

| | Kolom | Isi |
|---|---|---|
| **Kolom** | F0 | idle (berdiri) |
| | F1–F3 | siklus jalan (diputar otomatis mengikuti fase langkah) |
| **Baris** | r0–r7 | `neutral, smile, sad, shock, angry, mad, warm, happy` (urutan `EXPR_ROWS`) |

Jangkar: **tengah-bawah** (kaki menyentuh tepi bawah sel). Tinggi tampil di layar
diatur lewat `h` (default 112 px) — art boleh resolusi berapa pun, otomatis diskalakan.
ID sheet: `elena`, `arthur_muda`, `arthur_dewasa`, `arthur_buron`, `arthur_tua`.
Template berukuran siap-pakai tersedia: `assets/*_TEMPLATE.png` (ada manekin panduan
proporsi chibi + label baris/kolom). Pixel art? tambah `pixel:true` di manifest agar
nearest-neighbor (tanpa blur).

### Latar parallax — `assets/bg<era>_<layer>.png`

| Era | far | mid | near |
|---|---|---|---|
| 2088 | `bg2088_far` (.1) | `bg2088_mid` (.3) | `bg2088_near` (.85) |
| 1944 | `bg1944_far` (.14) | `bg1944_mid` (.45) | — (tanah prosedural) |
| 1968 bunker (rute A) | `bg1968A_far` (.2) | `bg1968A_mid` (.5) | — |
| 1968 lab (rute B) | `bg1968B_far` (.2) | `bg1968B_mid` (.5) | — |
| 1999 | `bg1999_far` (.12) | `bg1999_mid` (.45) | — |

Aturan gambar: **tile horizontal seamless** (lebar bebas, saran 960–1920 px),
jangkar bawah, angka kurung = faktor parallax. Langit & grading tetap prosedural.

### Deploy itch.io

Zip **wajib** berisi `index.html`, `src/`, `vendor/`, dan `assets/`. `legacy-canvas.html`
opsional dan hanya dipakai sebagai pembanding QA.

## ⚙️ Arsitektur Phaser modular

`index.html` kini merupakan entry point tipis. Phaser v4.2.1 di `vendor/phaser.min.js`
menjadi pemilik lifecycle, timing, pause render, scaling, dan scene utama. Renderer
Canvas 2D yang sudah teruji dipanggil pada fase `POST_RENDER`, sehingga seluruh dialog,
save, audio, ending, dan fallback prosedural tetap identik selama migrasi display-list
Phaser berlangsung bertahap.

Kode dipisah berdasarkan tanggung jawab:

- `src/core/` — utilitas, audio, input, state, loader aset, karakter.
- `src/data/` — seluruh node cerita dan pilihan.
- `src/game/` — flow gameplay, state machine, save, serta bootstrap Phaser.
- `src/render/` — dunia, efek, cover/onboarding, HUD, dan layar ending.
- `src/ui/` — dialog, narator, dan pilihan.

Rincian kontrak modul ada di `src/README.md`. `phaser-demo.html` tetap tersedia
sebagai eksperimen display-list native untuk scene jalan 2088, sedangkan
`legacy-canvas.html` adalah snapshot game sebelum entry point berpindah ke Phaser.

## 🎵 Musik & Audio (v2 — Leitmotif System)

Seluruh musik dibangkitkan **real-time via WebAudio sequencer** (lookahead scheduling, tanpa file audio).
Satu **leitmotif "Tema Elena"** (A minor, kotak musik) dipakai berulang dengan aransemen berbeda per era —
teknik *leitmotif* klasik film: pemain mengenali melodi yang sama yang berubah nasib seiring cerita:

| Scene | Lagu | Karakter
|---|---|---|
| Title / 2088 / Prolog | `theme` | Kotak musik lembut, pad Am–G–Am–E–F–C–E–Am
| 1944 Parit | `war` | Drone A rendah + stab tritone Eb, bel disonan — ketegangan perang
| 1968 | `spy` | Pulse bass 8th-note + hi-hat noise + frasa motif — nuansa Perang Dingin
| 1999 Kapsul | `cryo` | Bel FM arpeggio Am9/Fmaj9/Cmaj9 berkilau + reverb dingin
| True Ending | `end` | **Motif yang sama → resolusi C mayor**, pad hangat, bel oktaf — katarsis |

Arsitektur audio: bus `Master → limiter(kompressor) → out` dengan sub-bus **SFX / Ambience / Musik**;
musik lewat *feedback-delay* + *convolution reverb* (impulse noise buatan). Musnahnya timeline (glitch)
mem-fade musik ke 0, dan musik **duck otomatis ±6 dB saat teks dialog sedang mengetik** lalu naik lagi.

**Lapisan audio eksternal CC0** (dimuat malas setelah gesture pertama; file absen → senyap, fallback
prosedural tetap bunyi): loop ambience per era (`AMB_LAYER`) — gerimis+angin 1944, angin+bara 2088,
dengung mesin 1968/1999 — plus langkah kaki Kenney yang difilter per permukaan (lumpur/beton/metal) dan
rustle kertas saat panel dialog muncul. Kredit: *Kenney RPG Audio* (Kenney.nl, CC0); *AMB Rain Loop 1*
(Kresiek The Furry, CC0); *wind1* (Luke.RUSTLTD, CC0); *Fireplace Sound loop* (PagDev, CC0);
*Generator loop* (YCbCr, CC0) — semua dari OpenGameArt.org.

## ✨ Efek Visual (v2 — Juice Pass)

**Onboarding Figma:** layar judul kini dibuka oleh sequence parallax autoplay ±8,4 detik dari tujuh komposisi Figma. Delapan belas-plus lapisan PNG transparan di `assets/onboarding/` bergerak dengan kedalaman berbeda, lalu dissolve ke cover interaktif; tombol mulai baru aktif sesudah sequence selesai. Enter/sentuh pertama melewati intro, input berikutnya memulai game, dan opsi `reduceMotion` langsung menampilkan cover.

- **Karakter**: bayangan lembut di kaki, siklus kaki elips ayun/tumpu (kaki tumpu menapak, kaki ayun melengkung), fisika rambut & ayunan gaun dengan follow-through tertinggal dari langkah, condong saat berjalan + pitch badan saat akselerasi,
  kilau rambut ala anime, air mata (ekspresi sedih) & butir keringat (kaget)
- **Partikel**: fade + gravitasi + shrink; **debu terbang setiap langkah kaki**, bara api berkedip 1944, abu 2088,
  motes biru 1999, jejak energi di pusaran waktu
- **1944**: lampu sorot penjaga menyapu langit, kabut tanah melayang, kilat meriam → gradasi cakrawala oranye
- **1968 lab**: strip neon langit-langit + kerucut cahaya berkedip; mainframe berkedip tetap
- **1999**: *god rays* berayun dari langit-langit, lantai reflektif dingin, gelembung & es kapsul
- **2088**: matahari Crimson dengan kabut radial, api jauh berkedip antar bangunan
- **Vortex**: angka tahun **RGB-split** makin lebar, partikel streaks
- **Glitch**: sobekan strip + *ghosting* duplikat layar (screen blend)
- **UI**: panel pilihan *pop-in* spring (ease-out-back), prolog 2088 memakai `bgnarator.png` dengan zoom-parallax sinematik, cross-fade ekspresi `elenadialog1.png` / `elenadialog2sedih.png`, serta vignette merah berdenyut sinkron detak jantung,
  kamera "bernafas" halus saat berjalan
- **Intro 1944**: empat beat kamera Figma bergerak dari detail puing menuju ledakan utama, lalu menahan Elena setengah badan dan monolog sebelum kontrol berjalan aktif
- **Intro 1968**: slow-pan empat beat pada `backgroundbawahtanah.jpg`, kemudian Elena sedih muncul di tengah sebelum adegan bunker/lab dimulai

**v3 — Tampilan Valiant Hearts (komik perang):**

- Tipografi tulisan tangan: font **Patrick Hand** (SIL OFL) di-bundle lokal (`assets/fonts/patrick-hand(-ext).woff2`,
  2 subset unicode-range via `FontFace`) — fallback mulus ke Trebuchet bila game dibuka lewat `file://` (CORS memblokir font lokal)
- Kit **kertas & tinta** (`PAPER` + `sketchRR`): balon kata, strip narator, panel pilihan, jeda, backlog — semua panel
  kertas krem bertekstur serat dengan goresan tinta ganda bergoyang alami (jitter deterministik); pilihan aktif diberi
  goresan spidol merah; chip nama jadi cap tinta miring
- **Kotak caption komik** untuk judul babak (kiri atas, aksen tinta merah) menggantikan pita gelap
- **Siluet latar depan** `fgSilhouette` (parallax ×1.18): bibir tanah tak rata + kawat berduri & tunggul 1944, lempeng
  beton & rebar 2088, rantai bunker 1968A, pipa & kabel 1968B, pilar silo 1999
- **Kabut antar-lapisan** (`hazeBand`) untuk perspektif udara di tiap era
- Grading v3 "cetakan buku harian perang": serat kertas multiply + lift krem overlay + vignette + sudut gelap panel cetak
- Bingkai ganda sampul komik pada layar judul & endcard; palet chip/tag UI dilembutkan; langit 1944 mendung-oker

**v4 — Asset-rich & alive (properti/cuaca/pose/napas):**

- 9 **properti animasi** 3-frame gaya cat air per era (bendera, lentera, tong api, poster, bohlam, radio,
  beacon, uap pipa, CRT) — frame deterministik dari `T` (`reduceMotion` → frame 0)
- **Gerimis parit 1944** prosedural (streak miring + riak pecah di tanah), terkait loop audio hujan
- **Tarikan napas idle** ±1px pada karakter sheet saat diam (beda fase Elena/Arthur)
- **Pose momen kunci** menggantikan sheet pada node tertentu (genggam tangan empati, berlutut true_end,
  Arthur meraih kapsul) — fallback mulus ke sheet standar
- Lapisan **foreground lukis** (`bgLayerImg` ×1.18) menggantikan siluet prosedural bila file tersedia

**008 — Skill-audit pass (story × gameplay × aset):**

- **Titik selidik (lore hotspots)**: 5 penanda `✦` berdenyut di adegan jalan (2×1944, 2×1968, 1×1999) —
  `↓`/`S` atau ketuk → strip narator lore 2 baris (pakai kit kertas yang sama); tersimpan permanen di save
- **Gema loop lintas era**: déjà-vu bertingkat kini juga di pembuka 1968 (3 tingkat) & 1999 (2 tingkat);
  layar glitch menampilkan **berkas kasus** + sebaran ♥/⚙ siklus yg baru runtuh
- **Fix logika kepribadian**: empati/logika & rute **direset tiap loop** — sebelumnya bocor antar-loop
  (true ending bisa digrinding); kini tiap siklus menentukan Arthur-nya sendiri
- **Pacing level**: segmen jalan dibedakan per era (1944: 1800px pendekatan tegang · 1968: 1500 · 1999: 1300 rapat)
- **Kamera look-ahead** 22% kecepatan (di atas exp-smoothing) + bob halus indikator `▼ ENTER`
- **Mixer persepsi**: slider volume kini lewat kurva `v^2.2` (dB-feel) untuk MASTER/MUSIK/EFEK+ambience

## 🛠 Struktur Kode (dalam `index.html`)

```
PAL / ASSET_MANIFEST — palet warna terpusat + daftar aset PNG opsional (fallback prosedural)
AS / drawCharSheet / bgLayerImg — loader aset + penggambar spritesheet/parallax PNG
groundShadow   — bayangan lembut kaki karakter
drawElena / drawArthur — sprite chibi prosedural (ekspresi: neutral/smile/sad/shock/angry/mad/warm + air mata/keringat)
bg1944 / bg1968 / bg1999 / bg2088 — parallax 3-layer deterministik (seeded rand) + searchlight/god rays/neon/api
NODES          — seluruh dialog & percabangan (mirror dari file .yarn) + varian déjà-vu sadar-loop
LOG / drawLog  — backlog 30 baris terakhir (TAB/B); markEnd + END_TOTAL — penghitung ending n/6 di judul
setPaused / pauseItems — jeda: ducking musik & ambience, slider MASTER/MUSIK/EFEK, ukuran teks, reduceMotion
SONGS / MUS    — sequencer musik leitmotif (pad/bass/musicbox/bell/tick + delay & reverb)
SFX / setAmbience / setSong / duckMusic — audio prosedural WebAudio (SFX + ambience + musik per era)
update/render  — state machine: load → title → prologue → walk → dialog → vortex → glitch → endcard
```

## 🧪 Sudah Diuji Otomatis (Playwright headless)

- Rute golden penuh: Prologue → Empati×2 → 1B → 2B2 → Ikhlas → **True Ending** (0 error)
- Rute gagal: Logika×2 → 1A → 2A1 → TIMELINE COLLAPSE → **glitch loop** → kembali ke 1944 dengan intro loop
- Verifikasi audio: AnalyserNode memastikan musik benar2 bersuara, scheduler 5 lagu maju, ducking bus bekerja
- Verifikasi aset: dummy spritesheet PNG dimuat & digambar (jalur `drawCharSheet`), fallback prosedural saat file hilang
- Verifikasi desain: GIF diekstrak (2 frame unik), palet diukur per-piksel (rambut `#D8CCA8`, gaun `#C28279`, boot `#F1E6DC`+strap `#44240A`, skin `#F0E4D8`), sprite baru diverifikasi cocok (median boot `#F0E4D4` exact) + QA vision fitur lengkap tanpa artefak
- QA visual per-scene via AI vision: karakter, bubble, kapsul, glitch, endcard — semua lolos

*"Sampai bertemu di masa depan."*
