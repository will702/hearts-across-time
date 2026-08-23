@/Users/willson/.codex/RTK.md

# AGENTS.md — Hearts Across Time — Break The Loop

_Panduan kerja untuk agen coding. Fakta arsitektur di bawah mengikuti source saat ini, bukan rencana historis._

---

## 📚 Urutan sumber kebenaran

1. `index.html`, `legacy.html`, dan `src/` menentukan arsitektur serta perilaku produksi.
2. `FIRST_IDEA.md` adalah sumber kebenaran GDD/naratif. `DIALOG.md` adalah referensi dialog yang lebih rinci, bukan pengganti source produksi.
3. `README.md`, `src/README.md`, dan `docs/` menjelaskan implementasi saat ini.
4. `plans/` hanya menyimpan riwayat pass. Rencana berstatus DONE tidak mengalahkan source.

Jika dokumen dan kode berbeda, dokumentasikan serta pertahankan perilaku kode kecuali developer meminta perubahan. Untuk perubahan cerita, cocokkan `FIRST_IDEA.md`, `DIALOG.md`, dan `src/data/story.js`; jangan mengarang dialog atau cabang baru.

## 🏗️ Arsitektur strangler saat ini

Game adalah aplikasi browser 960×540 dengan dua runtime produksi yang berbagi `hat_save`:

- `index.html` adalah entry utama Phaser-native. Vite memuat `src/main.ts`; TypeScript/ESM memiliki Boot, Preload, Intro, Title, traversal 1944 sampai lampu sorot, UI/pause/touch, dan mini-game arloji.
- `legacy.html` mempertahankan runtime Phaser + Canvas/classic-script untuk tantangan lampu sorot, lanjutan 1944, era 1968/1999, dialog/rute, mini-game lain, loop, enam ending, dan bonus.
- Handoff native menyimpan era/run/`playerX` lalu membuka `legacy.html?continue=1`. Legacy memulihkan save dan memanggil `startWalk()` pada era/posisi yang sama.
- Runtime native tidak menggambar game melalui `POST_RENDER`. Sprite, latar, world object, UI, kamera, input, pause, animasi, dan physics adalah milik Phaser.
- `POST_RENDER` dan global `G`/`S`/`D` tetap hidup hanya di halaman legacy sampai slice pemiliknya dimigrasikan utuh.

Scene native terdaftar di `src/game/config.ts`:

1. `BootScene`
2. `PreloadScene`
3. `IntroScene`
4. `TitleScene`
5. `Era1944Scene`
6. `UIScene`
7. `WatchRepairScene`

Urutan classic-script berikut hanya berlaku di `legacy.html` dan tetap merupakan dependency graph:

1. `vendor/phaser.min.js`
2. `src/core/runtime.js`
3. `src/core/assets.js`
4. `src/render/characters.js`
5. `src/render/world.js`
6. `src/ui/dialog.js`
7. `src/data/story.js`
8. `src/data/worlds.js`
9. `src/game/world-object.js`
10. `src/game/surface-system.js`
11. `src/game/interaction-system.js`
12. `src/game/player-controller.js`
13. `src/game/flow.js`
14. `src/render/screens.js`
15. `src/game/main.js`

Jangan mengubah urutan legacy tanpa menelusuri semua global yang diproduksi dan dikonsumsi.

## 🗂️ Tanggung jawab modul

| Lokasi | Tanggung jawab |
| --- | --- |
| `src/main.ts`, `src/game/config.ts` | Bootstrap, konfigurasi Phaser/Arcade/Scale, scene list, dan snapshot debug native |
| `src/game/scenes/` | Lifecycle, display list, gameplay 1944, UI/pause, mini-game arloji, dan seam legacy |
| `src/game/entities/` | Entity Phaser-native; `Player` memiliki sprite, body kaki, animasi, shadow, dan langkah |
| `src/game/systems/` | Input intent, surfaces/collider, interaksi, dan trust boundary save |
| `src/game/world/` | Definisi object/surface 1944 yang data-driven serta factory Game Object/body |
| `src/game/narrative/`, `src/game/legacy/` | Guard transisi dan metadata/adaptor seam; bukan duplikat dialog |
| `src/core/`, `src/data/`, `src/game/*.js`, `src/render/`, `src/ui/` | Runtime legacy lengkap yang hanya dimuat `legacy.html` |

Peta rinci ada di `src/README.md`; runtime/save/handoff ada di `docs/ARCHITECTURE.md`; resep perubahan ada di `docs/AGENT_WORKFLOWS.md`.

## 🎮 State dan pemilik data

Native:

- Masing-masing Phaser Scene memiliki lifecycle dan Game Object-nya.
- `RunState` adalah state satu siklus dan disimpan melalui `SaveSystem.saveCycle()`.
- `SaveSystem` adalah satu-satunya trust boundary native untuk parse, normalisasi, migrasi `saveVersion: 2`, dan persist `hat_save`.
- `InputSystem` menghasilkan intent; `Era1944Scene` tetap owner mutasi gameplay/narasi.
- Registry `nativeState` dan `window.__HAT.snapshot()` hanya untuk observasi/QA, bukan sumber kebenaran gameplay.

Legacy:

- `G`, `S`, `D`, `SAVE`, `OPTS`, `AS`, `AU`, dan `T` hanya dimiliki runtime classic-script.
- `src/game/flow.js` memajukan `NODES`; renderer tidak boleh mendapat mutasi gameplay baru.
- Pengecualian render legacy yang harus dipahami saat debugging tetap meliputi `drawParts()`, `drawLensRain()`, `poseFade()`, dan `drawLog()`.

Jangan membuat state paralel baru untuk menjembatani runtime. Gunakan `hat_save`, `LEGACY_ENTRY_PATH`, dan adaptor yang ada.

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

Deploy itch.io memakai isi `dist/` dari `npm run build`. Build harus memuat `index.html`, `legacy.html`, bundle native, `assets/`, `vendor/`, dan classic-script legacy. Jangan memulihkan `phaser-demo.html` atau `legacy-canvas.html`.

## 🎨 Aset dan fallback

- Native memuat aset melalui `PreloadScene` dan memakai Phaser Game Object. Bila aset penting gagal, buat fallback texture sekali lalu pakai seperti texture biasa; jangan menggambar world melalui Canvas eksternal.
- Karakter native harus tetap memiliki fallback texture. World object wajib mempertahankan visual/prompt/input yang menyampaikan fungsi yang sama saat aset opsional absen.
- Legacy tetap memakai `ASSET_MANIFEST`, `AUDIO_MANIFEST`, `drawCharSheet()`, `bgLayerImg()`/`bgFgImg()`, dan fallback prosedural/WebAudio yang ada.
- Semua motion native menghormati registry `reduceMotion`; semua motion legacy menghormati `OPTS.reduceMotion`. Informasi dan input tidak boleh hilang.
- Gaya seni tetap watercolor-storybook, tile horizontal seamless, jangkar bawah, dan sheet karakter menghadap kanan.
- Pipeline Python di `scripts/` menulis bahan mentah ke `assets/gen/`. Agen tidak menjalankan regenerasi atau mengubah aset tanpa permintaan eksplisit.

## 🔒 Keamanan dan git

- `.env` berisi API key dan di-gitignore. Jangan membaca nilainya ke output, menyimpan, atau commit file tersebut.
- Jangan commit `.env`, `.venv/`, `node_modules/`, `dist/`, `assets/gen/`, `qa/artifacts/`, log, cache, atau screenshot. Source test di `qa/` dan `tests/` wajib di-versioning.
- Pertahankan kredit CC0 audio di `README.md` dan lisensi SIL OFL font di `assets/fonts/`.
- Gunakan Conventional Commits berbahasa Inggris dan satu pass per commit bila developer meminta commit.
- Pertahankan perubahan user; periksa status/diff sebelum mengedit dan stage hanya path yang diminta.

## 🧪 Kebijakan QA

QA memakai model AI-first hybrid. Jalankan cek relevan, perbaiki kegagalan objektif pada root cause, lalu ulangi sampai lolos.

- Logic/save/input: `npm run typecheck`, `npm run lint`, `npm run test:unit`, dan `npm run qa:smoke`.
- Gameplay/physics/render/UI/aset/audio: tambahkan `npm run build`, `npm run qa`, dan review `npm run qa:visual` dengan AI vision.
- Periksa console, request gagal/404, ukuran canvas, dan `window.__HAT.snapshot()` untuk native. Gunakan `?physicsDebug=1` bila menyentuh traversal.
- Gunakan `npm run qa:legacy` bila handoff, save bersama, atau classic-script berubah. Legacy memakai `window.__HAT.qa.snapshot()` pada `?qa=1`.
- Playwright harus memainkan input nyata dan menunggu snapshot deterministik. Jangan melemahkan assertion atau memutasi state langsung dari test agar hijau.

Agen boleh memperbaiki clipping, overlap, objek melayang, aset/prompt hilang, state/save salah, error browser, atau ketidaksesuaian acceptance criteria. Serahkan hanya keputusan seni/narasi yang benar-benar ambigu atau QA yang terblokir alat, dengan bukti yang jelas.

## ✍️ Konvensi perubahan

- Semua teks in-game dan dokumentasi proyek memakai Bahasa Indonesia; nama simbol mengikuti source.
- Native tetap TypeScript/ESM/Vite/Phaser tanpa React atau Matter.js. Hindari manager global dan abstraksi satu-implementasi.
- Legacy tetap classic-script modular dan padat. Jangan memindahkannya ke ESM sedikit demi sedikit atau mengubah urutan script.
- Perubahan cerita tetap di `src/data/story.js` sampai satu slice naratif dimigrasikan utuh. `storyData.ts` hanya metadata seam.
- World object 1944 ditambah di `src/game/world/era1944.ts`; collision, sensor, prompt, visual, condition, action, material, dan save key tetap terpisah dalam data.
- Save field baru wajib memiliki default aman, normalisasi/migrasi, dan unit test. Jangan rename/hapus key tanpa migrasi.
- State/scene native baru wajib memiliki start/update/render owner, shutdown, pause, input keyboard/touch, fallback, reduced-motion, save/resume, dan QA yang relevan.
- Batas executable berikutnya adalah tantangan lampu sorot 1944. Pertahankan handoff legacy sampai penggantinya lengkap dan terverifikasi.
