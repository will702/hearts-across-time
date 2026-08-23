# Workflow agen Hearts Across Time

_Resep perubahan minimum untuk arsitektur classic-script Phaser + Canvas saat ini._

---

## 📖 Menambah pilihan cerita

1. Baca node terkait di `FIRST_IDEA.md` (nama lama `FIKS IDE.md`), `DIALOG.md`, lalu implementasinya di `src/data/story.js`.
2. Tambah operasi pada `NODES` memakai kontrak yang sudah ada: `{t:'choice',opts:[{label,fx?,goto}]}`.
3. Pastikan setiap `goto` menunjuk node `N(id, ops)` yang ada. Gunakan `tagEmp()`/`tagLog()` untuk pilihan affinity tanpa menampilkan statistik, atau `tagR()` hanya untuk pilihan rute.
4. Mutasi `S` hanya di callback `fx`; respons dan transisi berikutnya tetap berupa operasi cerita.
5. Jangan mengganti label choice tanpa sadar: `SAVE.chosen[o.label]` memakai teks label sebagai key penanda “pernah dipilih”.
6. Sinkronkan sumber naratif bila perubahan cerita memang disetujui. Jangan mengubah flow/render untuk choice biasa.

## 🏁 Menambah atau mengubah ending

1. Ubah node cerita di `src/data/story.js`; ending ditutup dengan `{t:'ending',kind:'loop'}` atau `{t:'ending',kind:'true'}`.
2. Untuk ending koleksi baru, tambahkan key stabil ke `END_TOTAL` di `src/core/runtime.js`.
3. Petakan kondisi/node ke key tersebut di `src/game/flow.js::endingPuzzleKey()` dan pertahankan `startPuzzleAward()` sebagai satu jalur pencatatan.
4. Tambahkan judul kartu ke `src/render/screens.js::PUZZLE_TITLES` dan pastikan puzzle board tetap memiliki slot yang disengaja.
5. Pertahankan lifecycle: gagal → `puzzleaward` → `glitch` → reset siklus; true → `puzzleaward` → `endcard` → title.
6. Jika key lama berubah, migrasikan `SAVE.endings`; jangan membuat pemain kehilangan koleksi.

## 🔍 Menambah interactable object

Pilih pola yang sudah ada sebelum menambah sistem baru:

- World 1944: tambah object di `WORLD_DEFS['1944']` dengan behavior terpisah `collision`, `proximity`, `prompt`, `tap`, `action`, dan `enabled`. Action hanya berupa intent; mutasi cerita tetap ditangani `flow.js`.
- Lore opsional: tambah entry ke `HOTSPOTS` dan `LORE` di `src/render/world.js`; flow generic sudah menangani proximity, `SAVE.inspected`, dan modal `G.lore`.
- Item wajib: ikuti `WATCH_X`, `ROSE_X`, `GEM_X`, atau `PHOTO_X` di `src/game/flow.js`. Tambahkan posisi, proximity flag di `G.walk`, gate traversal, input keyboard/touch, start action, completion field `S`, dan `saveCycle()`.
- Visual dunia berada di `src/render/world.js`; marker/HUD khusus hanya ditambah di `src/render/screens.js` bila generic `drawHotspots()`/touch action tidak cukup.

Selalu sediakan jalur touch melalui `ptr`/`touchActHit()`, reset state di `resetAll()`, dan cegah reward ganda melalui completion flag atau `addStoryItem()`.

## 🌍 Memigrasikan era berikutnya ke Arcade Physics

1. Tambahkan definisi era ke `WORLD_DEFS`: `width`, `spawn`, ground/batas, lalu object collision/sensor/action. Jangan salin koordinat yang sama ke `update()` atau renderer.
2. Aktifkan era pada `HAT_WORLD.enter()`, lalu arahkan branch `walk` era itu ke controller fisika. Biarkan action kembali ke flow agar state cerita/save tidak pindah owner.
3. Pindahkan gate, lore proximity, dan trigger Arthur era tersebut sekaligus; hapus branch posisi manual hanya setelah seluruh interaksi era memiliki padanan data.
4. Pertahankan input keyboard/touch, posisi resume mini-game, camera look-ahead, fase langkah, `reduceMotion`, dan fallback Canvas. Gunakan `?physicsDebug=1` untuk pemeriksaan developer.
5. Migrasikan satu era per pass. Jangan menambah jump/platform/lane sebelum kontrol dan desain era memang meminta perubahan itu.

## 🎮 Menambah mini-game

1. Reuse pola start/update/render yang ada; jangan membuat base class atau registry baru untuk satu mini-game.
2. Di `src/game/flow.js`, buat `startX()` yang mengisi `G.state='x'` dan `G.x`, lalu `updateX(dt)` yang menangani keyboard/touch, success, assist/failure, dan kembali ke state asal.
3. Tambahkan case `x` ke `update()` dan branch render ke `src/render/screens.js::render()`; renderer detail tetap fungsi `drawX()` di `screens.js`.
4. Tambahkan state ke allowlist pause bila aman dipause, bersihkan di `resetAll()`, dan masukkan hasil ke `S`/`saveCycle()` hanya bila harus bertahan pada Continue.
5. Gunakan `OPTS.reduceMotion` untuk shake, pulse, cursor motion, atau flash. Jangan mengubah timing/target secara diam-diam kecuali opsi aksesibilitas memang membutuhkan jalur statis yang setara.
6. Sediakan prosedural fallback untuk ilustrasi yang diperlukan.

## 🎨 Menambah aset dengan fallback

1. Tambah entry stabil ke `src/core/assets.js::ASSET_MANIFEST` atau `AUDIO_MANIFEST`; jangan membaca `.env` pada runtime.
2. Di renderer owner, periksa `AS.imgs[id]` dan `im.width`, atau gunakan helper yang mengembalikan boolean.
3. Gambar aset bila tersedia; bila tidak, panggil fallback prosedural yang menyampaikan objek/informasi yang sama. Potret dekoratif murni boleh skip senyap.
4. Motion frame/strip harus memilih frame 0 atau bentuk stabil saat `OPTS.reduceMotion` aktif.
5. Pertahankan jangkar, scale, tile seam, lisensi, dan kredit. Jangan menambahkan bahan mentah `assets/gen/` atau menjalankan generator tanpa instruksi eksplisit.

Contoh minimal: `if(!bgFgImg(ctx,id,cam)) fgSilhouette(ctx,era,cam)`.

## ⌨️ Mengubah kontrol keyboard dan touch

1. Event capture generik tetap di `src/core/runtime.js`: `keys` untuk hold, `pressed`/`keyOnce()` untuk edge, `ptr.down` untuk hold, dan `ptr.tap` untuk edge.
2. Tambahkan semantics state-specific di updater pemilik dalam `src/game/flow.js`, bukan pada event listener DOM.
3. Tambah affordance dan hit area touch di `src/render/screens.js`; gunakan koordinat logical 960×540 dari `cvXY()`.
4. Konsumsi `ptr.tap` hanya sekali dan pahami bahwa `update()` menghapus semua `pressed`/tap pada akhir frame.
5. Jaga parity keyboard/touch, pause/mute hotspots, audio-init gesture, dan `preventDefault` untuk tombol browser yang perlu diblokir.

## 💾 Mengubah saved data

1. Klasifikasikan field sebagai permanen (`SAVE`), opsi (`OPTS`), atau satu siklus (`S` dan `SAVE.game.S`).
2. Tambahkan default aman ke object pemilik. Save lama harus tetap valid ketika field tidak ada.
3. Tambah normalisasi/coercion di `normalizeRun()` untuk field cycle; jangan percaya bentuk JSON localStorage.
4. Tambahkan field cycle ke object literal `saveCycle()` dan bersihkan di `resetAll()`/`startGlitch()` bila harus direset.
5. Pertahankan key lama. Jika rename atau perubahan arti tak dapat dihindari, baca key lama, tulis key baru, lalu simpan hasil migrasi tanpa menghapus progres lain.
6. Jangan menyimpan state render sementara, WebAudio node, Image, pointer, atau object Phaser.

Source saat ini belum memiliki `saveVersion`; jangan menambah versioning spekulatif. Tambahkan hanya saat migrasi nyata membutuhkan discriminator.

## 🐛 Mendiagnosis rendering atau transisi state

1. Temukan seluruh writer state dengan `rg "G\\.state ?=" src` dan seluruh branch update/render untuk nilai tersebut.
2. Trace entry function (`startWalk()`, `startVortex()`, `startChallenge()`, dan seterusnya), data yang dibuat di `G`, lalu case di `update()` dan branch di `render()`.
3. Untuk bug timing, mulai dari `HeartsGameScene.update(now,delta)` dan cap `dt`; untuk bug gambar, mulai dari event `POST_RENDER` dan `render()`.
4. Periksa urutan `<script>` dan global deferred sebelum menyimpulkan simbol hilang. Tidak ada import graph yang akan memberi error build.
5. Periksa konsumsi input: `keyOnce()` menghapus edge segera, `ptr.tap` dibersihkan akhir update, dan hotspot pause/mute berjalan lebih awal.
6. Periksa fallback PNG dan prosedural secara terpisah di source. Jangan memperbaiki hanya satu jalur.
7. Periksa `OPTS.reduceMotion`, `G.paused`, dan pengecualian mutasi render (`drawParts`, `drawLensRain`, `poseFade`, `drawLog`) bila gejala bergantung frame/pause.
8. Tentukan root cause dan perbaiki pada owner bersama dengan diff minimum. Jangan menambah guard di setiap caller bila satu invariant owner cukup.

## 🧪 Menjalankan QA AI-first

1. Jalankan `npm run qa:smoke` untuk logic/save/input dan `npm run qa` untuk gameplay, physics, render, UI, aset, atau audio.
2. Playwright membuka `?qa=1`, memberi seed acak tetap, memainkan kontrol nyata, dan menunggu `window.__HAT.qa.snapshot()`; jangan mengganti kegagalan dengan timeout atau mutasi state ad-hoc.
3. Untuk perubahan visual, jalankan `npm run qa:visual`, review frame di `qa/artifacts/frames/` dengan AI vision, lalu cek console, network, canvas, dan snapshot yang sama di Chrome DevTools.
4. Perbaiki temuan objektif pada owner/root cause dan ulangi cek relevan. Jangan update bukti atau melemahkan assertion untuk menyembunyikan regresi.
5. Handoff manusia hanya untuk rasa seni/narasi ambigu atau alat yang benar-benar terblokir; sebutkan cek dan bukti yang belum selesai.
