# ⏳ Hearts Across Time — Break The Loop

> 2D Side-Scroller Narrative Puzzle / Psychological Time-Loop • WebGL (Canvas)
> Dibangun untuk **COMPFEST Indie Game Jam** — implementasi penuh dari *Game Design Document* `FIKS IDE.md`.

## ▶ Cara Menjalankan

Tidak butuh build apa pun — satu file saja:

```
Buka index.html di browser (Chrome / Firefox / Edge / Safari)
```

atau untuk deploy itch.io: zip `index.html` → upload sebagai **HTML5 game** (960×540, scale to fit).

## 🎮 Kontrol

| Aksi | Keyboard | Sentuh |
|---|---|---|
| Bergerak | `← →` atau `A D` (lari: `Shift`) | tombol ◀ ▶ |
| Lanjut dialog | `Enter` / `Space` / klik | ketuk layar |
| Pilih opsi | `↑ ↓` + `Enter`, atau tombol `1` / `2` | ketuk opsi |
| Bisu-suara | `M` | ikon 🔊 pojok kanan atas |

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

Model image-generation (GLM / antigravity) tidak tersedia di lingkungan build ini, jadi seluruh visual
digambar prosedural di atas canvas dengan **palet yang diambil langsung dari referensi visual** yang dianalisis:

- Elena — rambut pirang `#F4D37A`, jas lab putih, gaun merah `#C25A5A`, boot coklat `#8B4513` (proporsi chibi 1:2)
- Kotak narator krem `#F5F0E8` berbingkai hitam tipis, persis gaya komik referensi
- 4 latar parallax 3-layer: parit 1944, bunker buronan/lab militer 1968 (berbeda per rute!), ruang kapsul 1999, kota rusak 2088

Keuntungan: file tunggal ±81 KB, loading instan, dan setiap sprite bisa di-tweak lewat konstanta `PAL` di source.

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

Setelah menambah aset, zip **wajib** berisi `index.html` + `assets/` (bukan lagi
satu file). Tanpa aset pun zip index.html saja tetap jalan penuh.

## ⚙️ Phaser atau tetap Canvas?

**Verdict: tetap Canvas untuk game ini.** Game sudah selesai & teruji, tidak butuh
fisika/tumbukan/tilemap, draw call < 60 per frame (Canvas 2D 60fps santai), dan
lapisan aset di atas sudah mencakup loader + spritesheet + fallback — 90% manfaat
Phaser untuk kasus ini dengan risiko migrasi nol.

**Pindah ke Phaser layak untuk proyek berikutnya** jika butuh: fisika platformer,
tilemap Tiled, ratusan animasi dalam atlas, post-processing WebGL (bloom/CRT),
atau integrasi Spine/DragonBones. Peta migrasi bila kelak diperlukan:
`NODES`/dialog tetap utuh → `render()` jadi Scene, parallax → `TileSprite` +
`scrollFactor`, `PAL` → tint/tintFill, audio WebAudio bisa dipertahankan apa adanya.

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

## ✨ Efek Visual (v2 — Juice Pass)

- **Karakter**: bayangan lembut di kaki, fisika rambut & ayunan gaun mengikuti langkah, condong saat berjalan,
  kilau rambut ala anime, air mata (ekspresi sedih) & butir keringat (kaget)
- **Partikel**: fade + gravitasi + shrink; **debu terbang setiap langkah kaki**, bara api berkedip 1944, abu 2088,
  motes biru 1999, jejak energi di pusaran waktu
- **1944**: lampu sorot penjaga menyapu langit, kabut tanah melayang, kilat meriam → gradasi cakrawala oranye
- **1968 lab**: strip neon langit-langit + kerucut cahaya berkedip; mainframe berkedip tetap
- **1999**: *god rays* berayun dari langit-langit, lantai reflektif dingin, gelembung & es kapsul
- **2088**: matahari Crimson dengan kabut radial, api jauh berkedip antar bangunan
- **Vortex**: angka tahun **RGB-split** makin lebar, partikel streaks
- **Glitch**: sobekan strip + *ghosting* duplikat layar (screen blend)
- **UI**: panel pilihan *pop-in* spring (ease-out-back), vignette merah berdenyut sinkron detak jantung prolog,
  kamera "bernafas" halus saat berjalan

## 🛠 Struktur Kode (dalam `index.html`)

```
PAL / ASSET_MANIFEST — palet warna terpusat + daftar aset PNG opsional (fallback prosedural)
AS / drawCharSheet / bgLayerImg — loader aset + penggambar spritesheet/parallax PNG
groundShadow   — bayangan lembut kaki karakter
drawElena / drawArthur — sprite chibi prosedural (ekspresi: neutral/smile/sad/shock/angry/mad/warm + air mata/keringat)
bg1944 / bg1968 / bg1999 / bg2088 — parallax 3-layer deterministik (seeded rand) + searchlight/god rays/neon/api
NODES          — seluruh dialog & percabangan (mirror dari file .yarn)
SONGS / MUS    — sequencer musik leitmotif (pad/bass/musicbox/bell/tick + delay & reverb)
SFX / setAmbience / setSong / duckMusic — audio prosedural WebAudio (SFX + ambience + musik per era)
update/render  — state machine: load → title → prologue → walk → dialog → vortex → glitch → endcard
```

## 🧪 Sudah Diuji Otomatis (Playwright headless)

- Rute golden penuh: Prologue → Empati×2 → 1B → 2B2 → Ikhlas → **True Ending** (0 error)
- Rute gagal: Logika×2 → 1A → 2A1 → TIMELINE COLLAPSE → **glitch loop** → kembali ke 1944 dengan intro loop
- Verifikasi audio: AnalyserNode memastikan musik benar2 bersuara, scheduler 5 lagu maju, ducking bus bekerja
- Verifikasi aset: dummy spritesheet PNG dimuat & digambar (jalur `drawCharSheet`), fallback prosedural saat file hilang
- QA visual per-scene via AI vision: karakter, bubble, kapsul, glitch, endcard — semua lolos

*"Sampai bertemu di masa depan."*
