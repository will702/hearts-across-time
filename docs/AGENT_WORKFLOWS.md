# Workflow agen Hearts Across Time

_Resep perubahan minimum untuk runtime produksi Phaser-native._

---

## 🧭 Pilih owner sebelum mengedit

1. Mulai dari `index.html`, `src/main.ts`, dan scene terdaftar di
   `src/game/config.ts`.
2. Temukan scene era/mini-game yang benar; jangan menaruh mutasi gameplay di renderer,
   UI, atau fixture test.
3. Narasi produksi berada di `src/game/narrative/storyScript.ts` dan dieksekusi oleh
   `DialogueScene`.
4. State satu siklus berada di `RunState`; persist hanya melalui `SaveSystem`.
5. `legacy.html` dan classic-script lama hanya dipakai saat tugas secara eksplisit
   meminta inspeksi historis atau parity regression.

## 🔍 Menambah object atau interaksi era

1. Tambah geometri dan behavior data-driven di
   `src/game/world/era1944.ts`, `era1968.ts`, atau `era1999.ts`.
2. Reuse `WorldObject`/`WorldFactory`; jangan membuat class baru untuk satu prop.
3. Biarkan `InteractionSystem` mengembalikan proximity, prompt, dan action simbolik.
4. Tangani mutasi run, reward, save, mini-game, dialog, atau transisi di scene era.
5. Tambah keyboard dan touch parity melalui `InputSystem`/`UIScene`.
6. Jika object menjadi gate, uji collider sebelum completion, setelah completion, dan
   setelah reload/Continue.

## 🌍 Mengubah alur era

1. Trace transisi dari scene era ke mini-game/dialog, lalu operasi `walk`, `vortex`,
   atau `ending` di `storyScript.ts`.
2. Pertahankan urutan wajib:
   - 1944: arloji → lampu sorot → dialog Arthur;
   - 1968: botol mawar → sinyal → buku harian/dialog;
   - 1999: permata → foto → krio → keputusan akhir.
3. Scene era tetap owner posisi resume dan autosave sebelum modal/transisi.
4. Saat mengganti urutan, uji Continue pada setiap era dan kondisi item yang belum/sudah
   selesai.
5. Jangan menambah redirect atau entry runtime lain sebagai jalan pintas.

## 🎮 Menambah atau mengubah mini-game

1. Buat satu `Phaser.Scene` bila mini-game membutuhkan lifecycle/pause/input terpisah;
   untuk interaksi kecil, tetap di scene era.
2. Terima `RunState`, `SaveSystem`, dan callback selesai sebagai data minimum.
3. Pisahkan aturan matematis/deterministik ke `src/game/minigames/` bila berguna untuk
   unit test.
4. Gunakan Phaser Game Object, keyboard, dan pointer. Completion harus idempotent dan
   reward tidak boleh ganda.
5. Persist hanya data yang diperlukan Continue. Jangan menyimpan timer, input, body,
   audio node, atau Game Object.
6. Assist, pause, touch, dan `reduceMotion` harus memberi informasi serta input setara.
7. Tambah unit test aturan murni dan E2E untuk buka, input, pause, completion, serta
   reload yang berisiko.

## 📖 Mengubah cerita atau ending

1. Baca `FIRST_IDEA.md`, `DIALOG.md`, lalu node aktif di
   `src/game/narrative/storyScript.ts`.
2. Pertahankan label pilihan, tujuan `goto`, route, dan key ending yang sudah tersimpan.
3. `DialogueScene` hanya menafsirkan operasi; teks/cabang baru tetap berada di
   `storyScript.ts`.
4. Trace hasil ke `PuzzleAwardScene`, `GlitchScene`, atau `EndCardScene`.
5. Enam key ending canonical adalah `A1`, `B1`, `B2lock`, `rebut`, `paradox`,
   dan `true`; jangan rename tanpa migrasi.
6. Jika bentuk save berubah, tambah normalisasi dan test di `SaveSystem.ts`.
7. Jangan mengarang dialog ketika GDD/referensi tidak menentukan hasil; minta keputusan.

## 🎨 Menambah aset

1. Muat aset di `PreloadScene` melalui Phaser Loader dan pakai key stabil pada Game
   Object owner.
2. Sediakan fallback minimum bila aset membawa informasi/input penting. Aset dekoratif
   boleh gagal tanpa memblokir boot.
3. Hindari preload aset yang tidak pernah dipakai; periksa key loader dan seluruh
   consumer bersama-sama.
4. Motion dekoratif memilih frame stabil saat `reduceMotion` aktif.
5. Pertahankan gaya watercolor-storybook, jangkar bawah, seamless horizontal, dan arah
   kanan untuk sheet karakter.
6. Jangan menjalankan generator, menambah `assets/gen/`, atau membaca `.env` tanpa
   permintaan eksplisit.

## ⌨️ Mengubah kontrol

1. Tambah semantics hold/edge di `InputSystem`, bukan event listener gerak baru per
   object.
2. `UIScene` menyediakan affordance/hit area dan mengirim intent sentuh.
3. Scene gameplay mengonsumsi intent dan tetap owner mutasi.
4. Scene modal harus memiliki keyboard/pointer parity dan membersihkan listener saat
   shutdown.
5. Jaga parity panah/WASD, action, touch, pause, pointer-up, kehilangan fokus, dan
   penghentian gerak pada body terblokir.
6. Tes input nyata melalui Playwright; jangan mengubah posisi/state langsung dari test.

## 💾 Mengubah saved data

1. Klasifikasikan field sebagai permanen atau satu siklus.
2. Tambah tipe/default di `SaveSystem.ts`, lalu coercion defensif di
   `normalizeSave()` atau `normalizeRun()`.
3. Naikkan `saveVersion` hanya bila perubahan arti membutuhkan discriminator; tetap
   baca save tanpa versi dan versi lama.
4. Persist state siklus melalui `saveCycle()` dan pertahankan key `hat_save`.
5. Tambah unit test untuk save kosong, rusak, versi lama, field asing aman, dan bentuk
   baru yang ditambahkan.
6. Uji Continue/reload langsung ke 1944, 1968, dan 1999 sesuai field `game.era`.

## 🐛 Mendiagnosis runtime

1. Reproduksi di entry produksi `/`.
2. Mulai dari `window.__HAT.snapshot()`, scene aktif, registry `nativeState`,
   console, request gagal, dan body `?physicsDebug=1`.
3. Trace `create()`/`update()` scene, lalu system/entity yang dipanggilnya. Periksa
   shutdown listener bila bug muncul setelah restart scene.
4. Periksa source operasi cerita bila state macet di dialog/rute.
5. Periksa jalur aset tersedia dan fallback secara terpisah.
6. Perbaiki invariant di owner bersama, bukan guard di setiap caller.

Gunakan `/legacy.html?qa=1` hanya untuk membandingkan perilaku referensi. Temuan parity
diterapkan pada owner TypeScript produksi, kecuali tugas memang menargetkan fixture lama.

## 🧪 Menjalankan QA

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run qa:smoke
npm run qa:visual
npm run qa
npm run qa:legacy
```

`npm run qa` adalah suite Playwright produksi native; `npm run qa:legacy` adalah
suite regression terpisah untuk runtime referensi. Gunakan cek proporsional:

- save/aturan murni: unit test;
- gameplay/render/input: build + Playwright native;
- visual: review artefak `qa:visual` dengan AI vision;
- perbandingan terhadap perilaku lama: `qa:legacy`.

Selalu periksa console, request gagal/404, ukuran canvas, snapshot, dan physics debug
bila relevan. Jangan melemahkan assertion atau mengganti input pemain dengan mutasi
state test-only agar suite hijau.
