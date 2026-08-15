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

Keuntungan: file tunggal ±66 KB, loading instan, dan setiap sprite bisa di-tweak lewat konstanta `PAL` di source.

## 🛠 Struktur Kode (dalam `index.html`)

```
PAL            — palet warna terpusat
drawElena / drawArthur — sprite chibi prosedural (ekspresi: neutral/smile/sad/shock/angry/mad/warm)
bg1944 / bg1968 / bg1999 / bg2088 — parallax 3-layer deterministik (seeded rand)
NODES          — seluruh dialog & percabangan (mirror dari file .yarn)
SFX / setAmbience — audio prosedural WebAudio (SFX + ambience per era, tanpa file audio)
update/render  — state machine: title → prologue → walk → dialog → vortex → glitch → endcard
```

## 🧪 Sudah Diuji Otomatis (Playwright headless)

- Rute golden penuh: Prologue → Empati×2 → 1B → 2B2 → Ikhlas → **True Ending** (0 error)
- Rute gagal: Logika×2 → 1A → 2A1 → TIMELINE COLLAPSE → **glitch loop** → kembali ke 1944 dengan intro loop
- QA visual per-scene via AI vision: karakter, bubble, kapsul, glitch, endcard — semua lolos

*"Sampai bertemu di masa depan."*
