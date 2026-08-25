# ⏳ Hearts Across Time — Break The Loop

> 2D Side-Scroller Narrative Puzzle / Psychological Time-Loop • Phaser 4 + TypeScript/Vite
> Dibangun untuk **COMPFEST Indie Game Jam** dari *Game Design Document*
> `docs/design/FIRST_IDEA.md` (sebelumnya `FIKS IDE.md`).

## ▶ Cara menjalankan

```sh
npm install
npm run dev
# buka http://127.0.0.1:8777/
```

Gate pengembangan utama:

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run qa:smoke
npm run qa:visual
npm run qa
```

`npm run build` menghasilkan aplikasi HTML5 960×540 di `dist/`. Zip **isi**
folder tersebut untuk deploy itch.io. Build hanya berisi `index.html`, bundle
Phaser-native, dan `assets/`.

## 🏗️ Arsitektur produksi

`index.html` adalah satu-satunya entry produksi. Vite memuat `src/main.ts`, lalu
`src/game/config.ts` mendaftarkan seluruh scene TypeScript/Phaser:

- fondasi: Boot, Preload, Intro, Title, Prologue, UI, dan Dialogue;
- traversal: 1944, 1968, dan 1999;
- mini-game: arloji, lampu sorot, botol mawar, sinyal, buku harian, permata, foto,
  dan krio;
- transisi/hasil: vortex, glitch loop, enam pecahan ending, true ending, dan bonus
  2088.

Semua sprite, latar, physics, kamera, input, dialog, UI, audio, save, loop, ending, dan
bonus dimiliki runtime native. `legacy/index.html` serta classic-script lama dipertahankan
sebagai referensi/parity regression melalui `npm run qa:legacy`; keduanya bukan
fallback produksi dan tidak termasuk `dist/`.

## 🎮 Kontrol

| Aksi | Keyboard | Sentuh |
| --- | --- | --- |
| Menu sampul | `↑ ↓` + `Enter`/`Space` | ketuk menu |
| Bergerak | `← →` atau `A D`; tahan `Shift` untuk lari | tombol ◀ ▶ |
| Interaksi | `↓`, `S`, `Space`, atau `Enter` | tombol aksi |
| Dialog | `Enter`/`Space`; `Ctrl`/`F` mempercepat ketik | ketuk panel |
| Pilihan dialog | `↑ ↓`/`W S` + `Enter`, atau `1–3` | ketuk opsi |
| Backlog dialog | `Tab`/`B`; `Esc` menutup | ketuk tombol backlog/tutup |
| Arloji | `← →`/`A D`, lalu `Space`/`Enter` | putar/ketuk kontrol |
| Lampu sorot, sinyal, krio | `← →`/`A D`, lalu `Space`/`Enter` | ketuk pilihan dan aksi |
| Botol mawar dan foto | `1–4`, arah/WASD, lalu `Space`/`Enter` | seret kepingan |
| Permata air | arah/WASD, `Space`/`Enter`; `R` reset | seret dan konfirmasi |
| Buku harian | `← →`/`A D`, `Space`/`Enter`; `Esc` tutup | tombol halaman |
| Jeda | `Esc`/`P`; saat jeda `R` ulang siklus, `M` menu | ikon jeda |
| Bisu suara | — | ikon suara |

Gameplay bonus 2088 memakai kontrol gerak/interaksi yang sama; lima simpul kenangan
memiliki kontrol pointer yang ditampilkan pada modal masing-masing.

## ✅ Implementasi gameplay dan GDD

| Fitur | Implementasi |
| --- | --- |
| Kepribadian tersembunyi | Pilihan dan tiga tantangan memberi Empati/Logika tanpa menampilkan angka saat bermain |
| Tiga era wajib | 1944 lampu sorot, 1968 penyetelan sinyal, 1999 stabilisasi krio; assist setelah tiga miss |
| Puzzle barang lintas waktu | Arloji, mawar, permata air, dan foto menjadi gate serta inventory satu siklus |
| Percabangan rute | Pilihan 1944 dan 1968 menghasilkan cabang akhir di 1999 |
| Loop | Ending gagal memberi pecahan, menaikkan loop, mereset state siklus, lalu kembali ke 1944 |
| Enam ending | `A1`, `B1`, `B2lock`, `rebut`, `paradox`, dan `true` tersimpan lintas sesi |
| True ending | Rute dan item yang benar memutus loop serta membuka end card |
| Bonus 2088 | Keenam pecahan membuka epilog kota pulih dengan lima simpul mini-game |
| Dialog | `storyScript.ts` memuat operasi say/choice/goto/walk/item/fx/vortex/ending; `DialogueScene` menafsirkannya |
| Save/Continue | `SaveSystem` menormalisasi `hat_save` v2 dan memulihkan langsung ke era 1944/1968/1999 |

Sumber kebenaran cerita adalah `docs/design/FIRST_IDEA.md`, `docs/design/DIALOG.md`, dan implementasi aktif
`src/game/narrative/storyScript.ts`.

## 🎨 Aset dan fallback

Aset produksi dimuat melalui `PreloadScene` dan dipakai sebagai Phaser Game Object.
Aset yang membawa informasi gameplay memiliki fallback texture/prosedural; aset
dekoratif boleh gagal tanpa memblokir boot.

Gaya visual tetap watercolor-storybook: garis pensil grafit, wash cat air muted,
lapisan horizontal seamless, dan jangkar karakter tengah-bawah.

### Kontrak sprite dan latar

- Sheet karakter: `assets/art/characters/<id>_sheet.png`, grid 4 kolom × 8 baris, sel 150×210.
- Kolom: F0 idle; F1–F3 siklus jalan.
- Baris: `neutral`, `smile`, `sad`, `shock`, `angry`, `mad`, `warm`,
  `happy`.
- Strip prop: `assets/art/props/prop_*.png`, tiga frame 200×200.
- Latar era: `assets/art/backgrounds/bg<era>_<layer>.png`; layer far/mid/foreground memakai scroll
  factor berbeda dan world bounds Phaser.
- Judul produksi memakai `assets/art/ui/title-cover.png` sebagai ilustrasi dan merender teks
  tepat **HEARTS ACROSS TIME / BREAK THE LOOP** melalui Phaser; raster wordmark lama
  bukan sumber teks produksi.

Karakter utama: Elena serta Arthur muda/dewasa/buron/tua. Aset tambahan mencakup
foreground, pose momen kunci, portrait, ilustrasi prolog/lab, vortex waktu, prop
animasi, puzzle, dan kota epilog.

### Pipeline aset

Skrip `scripts/gen_image.py`, `gen_exprs.py`, `gen_bgs.py`,
`build_sheets.py`, `compose_all.py`, `gen_props.py`, dan `build_props.py`
menyiapkan aset watercolor. `scripts/fix_bg_seams.py` mengukur dan merapikan seam
tanpa regenerasi. Bahan mentah masuk ke `assets/gen/` dan tidak di-commit.

Generator memerlukan credential lokal di `.env`; jangan membaca, menjalankan
regenerasi, atau mengganti aset tanpa permintaan eksplisit.

Font **Cinzel**, **Poppins**, dan **Patrick Hand** (SIL OFL) dibundle di
`assets/fonts/`.

## 🎵 Musik dan audio

`SoundManager` memiliki musik WebAudio prosedural, bus master/SFX/ambience/music,
ducking dialog, mute, dan ambience per era. Sampel CC0 di `assets/audio/` menambah
langkah kaki, hujan, angin, api, dengung mesin, dan SFX UI; file yang absen tidak
memblokir gameplay.

Kredit CC0:

- *Kenney RPG Audio* — Kenney.nl
- *AMB Rain Loop 1* — Kresiek The Furry
- *wind1* — Luke.RUSTLTD
- *Fireplace Sound loop* — PagDev
- *Generator loop* — YCbCr
- sumber distribusi: OpenGameArt.org

## 🛠️ Struktur kode

```text
index.html                       — entry produksi Vite/Phaser
src/main.ts                      — bootstrap dan snapshot debug
src/game/config.ts               — konfigurasi serta registry scene
src/game/scenes/*.ts             — seluruh gameplay, dialog, mini-game, loop, ending, bonus
src/game/world/*.ts              — definisi dunia tiga era dan factory
src/game/systems/*.ts            — input, interaksi, surface, save
src/game/narrative/storyScript.ts — operasi narasi/rute produksi
src/game/minigames/*.ts          — aturan murni yang dapat diuji
src/game/audio/SoundManager.ts   — musik, ambience, dan SFX
assets/art/{backgrounds,characters,props,ui,minigames,bonus}/ — visual runtime
legacy/                         — referensi/parity regression, bukan build produksi
docs/{design,plans}/            — GDD/dialog dan arsip rencana
tests/{unit,e2e,legacy}/        — seluruh pemeriksaan otomatis
```

Rincian owner ada di `src/README.md`, kontrak runtime di
`docs/ARCHITECTURE.md`, dan resep perubahan di `docs/AGENT_WORKFLOWS.md`.

## 🧪 QA otomatis

`npm run qa` menjalankan suite Playwright produksi dari `tests/e2e/`.
`npm run qa:smoke` memilih checkpoint cepat, sedangkan `npm run qa:visual`
menyediakan frame deterministik untuk review AI vision. `npm run qa:legacy`
menjalankan suite parity terpisah terhadap runtime referensi.

`window.__HAT.snapshot()` memberi state serializable; `?qa=1` melewati intro dan
`?physicsDebug=1` menampilkan body Arcade. Artefak lokal berada di
`qa/artifacts/` dan tidak di-commit.

Gate lengkap sebelum release:

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run qa
```

*“Sampai bertemu di masa depan.”*
