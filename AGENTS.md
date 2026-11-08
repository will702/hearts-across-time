@/Users/willson/.codex/RTK.md

# AGENTS.md — Hearts Across Time — Break The Loop

_Panduan kerja untuk agen coding. Fakta arsitektur di bawah mengikuti source saat ini, bukan rencana historis._

---

## 📚 Urutan sumber kebenaran

1. `index.html`, `src/main.ts`, dan file TypeScript di `src/game/` menentukan perilaku produksi.
2. `docs/design/FIRST_IDEA.md` adalah sumber kebenaran GDD/naratif. `docs/design/DIALOG.md` adalah referensi dialog rinci; implementasi aktif berada di `src/game/narrative/storyScript.ts`.
3. `README.md`, `src/README.md`, dan `docs/` menjelaskan implementasi saat ini.
4. `docs/plans/`, `legacy/index.html`, dan classic-script lama adalah riwayat/referensi. Semuanya tidak mengalahkan source produksi.

Jika dokumen dan kode berbeda, dokumentasikan serta pertahankan perilaku kode kecuali developer meminta perubahan. Untuk perubahan cerita, cocokkan `docs/design/FIRST_IDEA.md`, `docs/design/DIALOG.md`, dan `storyScript.ts`; jangan mengarang dialog atau cabang baru.

## 🏗️ Arsitektur produksi saat ini

Game produksi adalah aplikasi browser Phaser 4 + TypeScript/ESM/Vite dengan kanvas logis 960×540:

- `index.html` memuat `src/main.ts`, yang membuat satu `Phaser.Game` dari `src/game/config.ts`.
- Seluruh era 1944/1968/1999, dialog dan pilihan, mini-game wajib, loop, enam ending, true ending, serta bonus 2088 dimiliki scene native.
- Sprite, latar, world object, UI, kamera, input, pause, animasi, audio, dan Arcade Physics adalah milik Phaser; produksi tidak memakai `POST_RENDER` atau global classic-script.
- `legacy/index.html` dan file `.js` lama hanya referensi/parity regression. Build Vite tidak memasukkannya ke `dist/`.

Scene produksi terdaftar satu kali di `src/game/config.ts`:

1. Fondasi: `BootScene`, `PreloadScene`, `IntroScene`, `TitleScene`, `PrologueScene`, `UIScene`, `DialogueScene`.
2. Era: `Era1944Scene`, `Era1968Scene`, `Era1999Scene`.
3. Mini-game: `WatchRepairScene`, `SpotlightChallengeScene`, `RosePuzzleScene`, `SignalTuneScene`, `DiaryScene`, `GemAlignScene`, `PhotoPuzzleScene`, `CryoBalanceScene`.
4. Transisi/hasil: `VortexScene`, `GlitchScene`, `PuzzleAwardScene`, `EndCardScene`, `Bonus2088Scene`.

Jangan membuat entry produksi kedua atau menghidupkan kembali redirect ke runtime lama.

## 🗂️ Tanggung jawab modul

| Lokasi | Tanggung jawab |
| --- | --- |
| `src/main.ts`, `src/game/config.ts` | Bootstrap, konfigurasi Phaser/Arcade/Scale, scene list, dan snapshot debug |
| `src/game/scenes/` | Lifecycle, display list, ketiga era, dialog, UI/pause/touch, mini-game, loop, ending, dan bonus |
| `src/game/entities/` | Entity Phaser; `Player` memiliki sprite, body kaki, animasi, shadow, dan langkah |
| `src/game/systems/` | Input intent, surfaces/collider, interaksi, dan trust boundary save |
| `src/game/world/` | Definisi object/surface data-driven untuk 1944/1968/1999 serta factory Game Object/body |
| `src/game/narrative/storyScript.ts` | Operasi dialog, pilihan, rute, transisi era, dan ending produksi |
| `src/game/minigames/` | Aturan murni yang dapat diuji tanpa renderer |
| `src/game/audio/SoundManager.ts` | Musik, ambience, SFX, mute, ducking, dan lifecycle audio lintas scene |
| `legacy/` | Referensi implementasi lama dan target `qa:legacy`; bukan owner produksi |

Peta rinci ada di `src/README.md`; kontrak runtime/save ada di `docs/ARCHITECTURE.md`; resep perubahan ada di `docs/AGENT_WORKFLOWS.md`.

## 🎮 State dan pemilik data

- Masing-masing Phaser Scene memiliki lifecycle dan Game Object-nya.
- `RunState` adalah state satu siklus dan disimpan melalui `SaveSystem.saveCycle()`.
- `SaveSystem` adalah satu-satunya trust boundary untuk parse, normalisasi, migrasi `saveVersion: 2`, dan persist `hat_save`.
- `InputSystem` menghasilkan intent; scene era tetap owner mutasi gameplay, narasi, reward, save, dan transisi.
- `DialogueScene` menafsirkan operasi dari `storyScript.ts`; renderer tidak menjadi owner pilihan atau state cerita.
- Registry menyimpan service/opsi lintas scene seperti `saveSystem`, `soundManager`, `reduceMotion`, `loadErrors`, dan `nativeState`, bukan salinan state gameplay.
- `window.__HAT.snapshot()` dan registry `nativeState` hanya untuk observasi/QA.

Jangan membuat manager global atau key save paralel.

## ▶️ Menjalankan dan deploy

```sh
npm install
npm run dev
# buka http://127.0.0.1:8777/
```

Gate utama:

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run qa
npm run qa:legacy
```

`npm run qa` adalah suite Playwright produksi Phaser-native. `npm run qa:legacy` hanya regression parity terhadap runtime referensi. Deploy itch.io memakai isi `dist/` dari `npm run build`; build memuat `index.html`, bundle native, dan `assets/`, bukan `legacy/index.html`, `legacy/vendor/`, atau classic-script lama.

## 🎨 Aset dan fallback

- Muat aset produksi melalui `PreloadScene` dan gunakan key stabil pada Phaser Game Object.
- Bila aset penting gagal, buat fallback texture sekali lalu pakai seperti texture biasa. Jangan menggambar world melalui Canvas eksternal.
- Karakter wajib memiliki fallback texture. World object wajib mempertahankan visual, prompt, dan input yang menyampaikan fungsi sama saat aset opsional absen.
- Semua motion menghormati registry `reduceMotion`; informasi dan input tidak boleh hilang.
- Gaya seni tetap watercolor-storybook, tile horizontal seamless, jangkar bawah, dan sheet karakter menghadap kanan.
- Pipeline Python di `scripts/` menulis bahan mentah ke `assets/gen/`. Jangan menjalankan regenerasi atau mengubah aset tanpa permintaan eksplisit.

## 🔒 Keamanan dan git

- `.env` berisi API key dan di-gitignore. Jangan membaca nilainya ke output, menyimpan, atau commit file tersebut.
- Jangan commit `.env`, `.venv/`, `node_modules/`, `dist/`, `assets/gen/`, `qa/artifacts/`, log, cache, atau screenshot. Source test di `tests/` wajib di-versioning.
- Pertahankan kredit CC0 audio di `README.md` dan lisensi SIL OFL font di `assets/fonts/`.
- Gunakan Conventional Commits berbahasa Inggris dan satu pass per commit bila developer meminta commit.
- Pertahankan perubahan user; periksa status/diff sebelum mengedit dan stage hanya path yang diminta.

## 🧪 Kebijakan QA

QA memakai model AI-first hybrid. Jalankan cek relevan, perbaiki kegagalan objektif pada root cause, lalu ulangi sampai lolos.

- Logic/save/input: `npm run typecheck`, `npm run lint`, `npm run test:unit`, dan `npm run qa:smoke`.
- Gameplay/physics/render/UI/aset/audio: tambahkan `npm run build`, `npm run qa`, dan review `npm run qa:visual` dengan AI vision.
- Periksa console, request gagal/404, ukuran canvas, dan `window.__HAT.snapshot()`. Gunakan `?physicsDebug=1` bila menyentuh traversal.
- Gunakan `npm run qa:legacy` hanya saat membandingkan parity atau sengaja mengubah fixture/reference lama; kegagalannya bukan alasan mengalihkan fitur produksi kembali ke classic-script.
- Playwright harus memainkan input nyata dan menunggu snapshot deterministik. Jangan melemahkan assertion atau memutasi state langsung dari test agar hijau.

Agen boleh memperbaiki clipping, overlap, objek melayang, aset/prompt hilang, state/save salah, error browser, atau ketidaksesuaian acceptance criteria. Serahkan hanya keputusan seni/narasi yang benar-benar ambigu atau QA yang terblokir alat, dengan bukti jelas.

## ✍️ Konvensi perubahan

- Semua teks in-game dan dokumentasi proyek memakai Bahasa Indonesia; nama simbol mengikuti source.
- Produksi tetap TypeScript/ESM/Vite/Phaser tanpa React atau Matter.js. Hindari manager global dan abstraksi satu-implementasi.
- Perubahan cerita dilakukan di `src/game/narrative/storyScript.ts`; cocokkan GDD/dialog dan tambah test operasi/rute terkait.
- World object ditambah di definisi era pada `src/game/world/`; collision, sensor, prompt, visual, condition, action, material, dan save key tetap terpisah dalam data.
- Save field baru wajib memiliki default aman, normalisasi/migrasi, dan unit test. Jangan rename/hapus key tanpa migrasi.
- Scene baru wajib memiliki start/update/render owner, shutdown, pause, input keyboard/touch, fallback, reduced-motion, save/resume, dan QA relevan.
- Classic-script lama tidak menerima fitur produksi baru. Ubah hanya bila tugas secara eksplisit menargetkan referensi atau parity regression.
