# Workflow agen Hearts Across Time

_Resep perubahan minimum untuk arsitektur strangler Phaser-native + legacy._

---

## 🧭 Pilih owner sebelum mengedit

1. Buka `index.html` untuk vertical slice native atau `legacy.html` untuk cerita yang
   belum dimigrasikan; jangan berasumsi keduanya menjalankan modul yang sama.
2. Untuk Boot, Preload, Intro, Title, 1944, UI, dan arloji, mulai dari file `.ts` di
   `src/game/`.
3. Untuk 1968/1999, dialog lengkap, mini-game lain, loop, ending, dan bonus, mulai dari
   classic-script `.js` owner lama.
4. Jangan memperbaiki bug native dengan menambah global legacy, atau memperbaiki bug
   legacy dengan menggandakan state ke scene native.
5. Pertahankan satu seam integrasi: `hat_save` yang dinormalisasi dan navigasi melalui
   `LEGACY_ENTRY_PATH`; `LegacyStateAdapter` menangani Continue save 1968/1999.

## 🔍 Menambah object atau interaksi 1944

1. Tambah geometri dan behavior data-driven di `src/game/world/era1944.ts`.
2. Reuse `WorldObject`/`WorldFactory`; jangan membuat class baru untuk satu prop.
3. Biarkan `InteractionSystem` mengembalikan proximity, prompt, dan action simbolik.
4. Tangani mutasi run, reward, save, mini-game, atau transisi di `Era1944Scene`.
5. Tambah keyboard dan touch parity melalui `InputSystem`/`UIScene`.
6. Jika object menjadi gate, uji collider aktif sebelum completion dan benar-benar
   terbuka setelah completion serta setelah reload.

## 🌍 Memigrasikan batas berikutnya

1. Pilih satu batas utuh. Batas saat ini adalah interaksi lampu sorot: native menyimpan
   era 1944/`playerX`, lalu legacy memulihkannya lewat `?continue=1`.
2. Batas executable berikutnya adalah tantangan lampu sorot. Inventarisasi aturan,
   assist, posisi resume, save, pause, touch, reduced motion, aset, dan fallback legacy.
3. Tambah scene native dan data world tanpa mengimpor global classic-script.
4. Pindahkan seluruh perilaku yang diperlukan pemain untuk masuk, bermain, menyimpan,
   dan keluar dari slice tersebut. Jangan menyalin dialog sebagian.
5. Pertahankan fallback ke `legacy.html` sampai parity unit, E2E, keyboard, touch,
   reload, dan asset/error tercapai.
6. Setelah slice lengkap, pindahkan handoff ke dialog Arthur; jangan menghapus runtime
   legacy atau scene lain yang belum dimigrasikan. Migrasi 1968 dilakukan sesudah batas
   1944 berikutnya sudah eksplisit.

## 🎮 Menambah mini-game native

1. Buat satu `Phaser.Scene` hanya bila mini-game membutuhkan lifecycle/pause/input
   terpisah; untuk interaksi kecil, tetap di scene era.
2. Terima `RunState`, `SaveSystem`, dan callback selesai sebagai data scene minimum.
3. Gunakan Phaser Game Object, keyboard, dan pointer; jangan menggambar lewat Canvas
   `POST_RENDER` native.
4. Persist hanya data yang dibutuhkan Continue. Completion harus idempotent dan reward
   tidak boleh ganda.
5. Assist, pause, touch, dan `reduceMotion` harus memberi informasi serta input setara.
6. Tambah unit test untuk aturan murni dan E2E untuk buka, input, pause, completion,
   serta reload yang berisiko.

Mini-game yang belum native tetap mengikuti pola `startX()`/`updateX()` di
`src/game/flow.js` dan renderer `drawX()` di `src/render/screens.js`. Jangan
memindahkannya kecuali slice era pemiliknya sedang dimigrasikan.

## 📖 Mengubah cerita atau ending legacy

1. Baca `FIRST_IDEA.md`, `DIALOG.md`, lalu node aktif di `src/data/story.js`.
2. Ubah callback/operasi di owner legacy dan trace transisi di `src/game/flow.js`.
3. Pertahankan label choice yang menjadi key `chosen` dan key ending yang sudah
   tersimpan.
4. Jangan menyalin perubahan itu ke `storyData.ts`: file native tersebut hanya metadata
   seam, bukan duplikat dialog.
5. Jika perubahan ikut mengubah bentuk save, tambahkan migrasi di `SaveSystem.ts` dan
   normalisasi legacy yang sesuai.

## 🎨 Menambah aset

1. Untuk scene native, muat aset di `PreloadScene` melalui Phaser Loader dan pakai key
   stabil pada Game Object owner.
2. Sediakan fallback minimum bila aset membawa informasi/input penting. Aset dekoratif
   boleh gagal tanpa memblokir boot.
3. Untuk konten legacy, gunakan `src/core/assets.js::ASSET_MANIFEST` atau
   `AUDIO_MANIFEST` dan pertahankan fallback Canvas/WebAudio lama.
4. Motion dekoratif memilih frame stabil saat `reduceMotion` aktif.
5. Jangan menjalankan generator, menambah `assets/gen/`, atau membaca `.env` tanpa
   permintaan eksplisit.

## ⌨️ Mengubah kontrol native

1. Tambah semantics hold/edge di `InputSystem`, bukan event listener baru per object.
2. `UIScene` hanya menyediakan affordance/hit area dan mengirim intent sentuh.
3. Scene gameplay mengonsumsi intent dan tetap owner mutasi.
4. Jaga parity panah/WASD, action keyboard, touch, pause, pointer-up, kehilangan fokus,
   dan penghentian gerak pada body yang terblokir.
5. Tes input nyata melalui Playwright; jangan mengubah posisi/state langsung dari test.

Kontrol legacy tetap ditangkap `src/core/runtime.js` dan dikonsumsi
`src/game/flow.js`; ubah jalur itu hanya untuk bug/fitur legacy.

## 💾 Mengubah saved data

1. Klasifikasikan field sebagai permanen atau satu siklus; jangan menyimpan state render
   dan object Phaser.
2. Tambah tipe/default di `SaveSystem.ts`, lalu coercion defensif di `normalizeSave()`
   atau `normalizeRun()`.
3. Naikkan `saveVersion` hanya bila perubahan arti membutuhkan discriminator; tetap
   baca save tanpa versi dan versi lama.
4. Persist state siklus melalui `saveCycle()` dan pertahankan key `hat_save` agar legacy
   dapat melanjutkan.
5. Tambah unit test untuk save kosong, rusak, versi lama, field asing aman, dan bentuk
   baru yang ditambahkan.
6. Uji Continue/reload pada batas native dan handoff legacy.

## 🐛 Mendiagnosis runtime

1. Reproduksi di entry yang benar: `/` untuk native atau `/legacy.html` untuk legacy.
2. Native: mulai dari `window.__HAT.snapshot()`, scene aktif, registry `nativeState`,
   console, request gagal, dan body `?physicsDebug=1`.
3. Trace `create()`/`update()` scene, lalu system/entity yang dipanggilnya. Periksa
   shutdown listener bila bug muncul setelah restart scene.
4. Legacy: cari seluruh writer `G.state`, lalu branch `flow.js::update()` dan
   `screens.js::render()`; periksa urutan script dan konsumsi input edge.
5. Periksa jalur aset tersedia dan fallback secara terpisah.
6. Perbaiki invariant di owner bersama, bukan guard di setiap caller.

## 🧪 Menjalankan QA

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run qa:smoke
npm run qa:visual
npm run qa
```

Gunakan cek yang proporsional. Perubahan save/aturan murni wajib menjalankan unit test;
perubahan gameplay/render/input menjalankan Playwright. Untuk visual, review artefak
`qa:visual` dengan AI vision serta periksa console, request gagal/404, ukuran canvas,
snapshot, dan physics debug bila relevan. Jangan melemahkan assertion atau mengganti
input pemain dengan mutasi state test-only agar suite hijau.
