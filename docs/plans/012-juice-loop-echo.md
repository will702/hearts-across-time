# 012 — Juice Pack, Gema Loop, Mekanik Challenge Unik

## Selesai

### Grafis
- **G1 kamera emosional**: dorongan zoom ×1,12 ke pembicara saat ekspresi kuat (`sad/shock/angry/mad/warm/happy`) atau node berpose; jangkar bubble ikut ditransform; reset di semua transisi state; nonaktif saat `reduceMotion`.
- **G2 atmosfer era** (`eraPostFX` di `world.js`, dipanggil di walk/dialog/challenge/glitch/endcard): selaput beku kristal 1999 (statis saat reduceMotion), scanline CRT + band fosfor 1968B, tetesan hujan lensa 1944.
- **G5 hantu gema dirender di bawah okluder depan** agar kedalaman parallax konsisten.

### Audio
- **P5 kelelahan loop**: leitmotif membusuk per siklus — tempo −3,5%/wear (maks 4 loop), nada melodi musicbox/bell bisa hilang (hash deterministik per langkah → titik rusak konsisten), detune ±(4–13) sen pada partial. Lagu `end` dikecualikan.

### Gameplay
- **P1 mekanik challenge unik per era** (`CHALLENGE_CONF.mode`):
  - 1944 `dodge` — koridor top-down, lari antara 3 karung aman sampai garis goal; kerucut sorot menyapu sinusoidal; tertangkap di ruang terbuka mengisi deteksi (.42 dtk) → vignette merah → miss reset.
  - 1968 `tune` — setelan manual tiga band, logika lama utuh.
  - 1999 `balance` — meter VITAL/SERUM saling tarik-menarik + luruh pasif; tahan ◀/▶; ambang aman .22; progres stabilisasi 5 dtk; meter kosong = miss.
  - Sentuh: tahan sisi kiri/kanan bawah layar. Assist 3 miss dipertahankan.
- **P2+G5 gema loop**: jejak X pemain direkam per era (±8 sampel/dtk, maks 600); arsip saat glitch (`ECHO.prev`); siklus berikutnya menampilkan Elena tembus cahaya (α ~.24) mengulang jalur lama tersinkron waktu segmen — bisa mendahulu/ketinggalan "dirimu". Sesi-saja, tidak persist.
- **P3 hadiah lore**: jejak kelima → strip narator hadiah + segel `✦ KISAH LENKAP 5/5` di cover + baris emas di endcard (`SAVE.loreToastDone`, idempoten).
- **P4 rekap endcard**: bar afinitas ♥/⚙ tumbuh-ease + chip rute (1A…2B2) + chip pendekatan tiap tantangan (♥/⚙).
- **P6 sentuh**: pad tinta terlihat dengan umpan balik tekan + tombol ▼ kontekstual (PERIKSA/BUKU/AKTIFKAN) yang ikut memicu interaksi.

## Implementasi

- `legacy/src/core/runtime.js` — musTick wear, detune voice func, field zoom di `G`.
- `legacy/src/render/world.js` — `eraPostFX` + cache frost/scanline/lens, `LORE_IDS`/`loreFoundCount`, `TOUCH_ACT`, `drawEchoGhost`.
- `legacy/src/game/flow.js` — target zoom & reset, ECHO rekam/arsip, mode challenge, touch zones, toast lore.
- `legacy/src/render/screens.js` — transform zoom dunia, panggilan FX, segel cover, rekap endcard, pad sentuh, potret dialog.

## Verifikasi

- Seluruh file lolos `node --check`; `build_sheets.py` lolos `ast.parse`.
- QA runtime (golden/failA/manual dodge-balance/gema/hantu) menjadi bagian developer — belum dijalankan agen.
