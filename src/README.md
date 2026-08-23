# Peta modul `src/`

_Referensi singkat untuk migrasi strangler Phaser-native Hearts Across Time._

---

## 📦 Dua runtime yang sengaja hidup berdampingan

`index.html` adalah entry produksi Phaser-native. Vite memuat `src/main.ts`, lalu
TypeScript/ESM membuat `Phaser.Game` dan scene native.

`legacy.html` mempertahankan game lengkap sebelum migrasi. Halaman ini masih memuat
classic-script `.js` berurutan dan menjadi owner narasi 1968/1999, dialog bercabang,
mini-game yang belum dipindah, loop, ending, serta bonus. Jangan mengubah urutan script
di `legacy.html` tanpa menelusuri semua global yang diproduksi dan dikonsumsi.

Sumber kebenaran berlaku per wilayah:

- Vertical slice native: `src/main.ts` dan file `.ts` di `src/game/`.
- Konten yang belum dimigrasikan: `legacy.html` dan file `.js` lama.
- Narasi/GDD: `FIRST_IDEA.md`, `DIALOG.md`, lalu implementasi aktif di
  `src/data/story.js` sampai runner naratif native benar-benar menggantikannya.

## 🎬 Scene Phaser-native

| Scene | Tanggung jawab |
| --- | --- |
| `BootScene` | Memuat dan menormalisasi save, membuat `StoryRunner`, serta membaca opsi `reduceMotion` |
| `PreloadScene` | Memuat aset native melalui Phaser Loader dan membuat fallback minimum |
| `IntroScene` | Memutar atau melewati intro dengan Game Object Phaser |
| `TitleScene` | Menu keyboard/touch, continue, siklus baru, replay intro, dan akses cerita legacy |
| `Era1944Scene` | Traversal 1944: world, pemain, kamera, arloji, lore, autosave, dan handoff lampu sorot |
| `UIScene` | HUD, prompt, kontrol sentuh, toast, dan pause overlay |
| `WatchRepairScene` | Mini-game perbaikan arloji dengan keyboard/touch dan assist tiga miss |

Belum native: tantangan lampu sorot dan dialog lanjutan 1944, era 1968, era 1999,
dialog/rute lengkap, mini-game selain arloji, loop/ending, dan bonus. Semua tetap dapat
dijalankan melalui `legacy.html?continue=1` atau tombol cerita lengkap.

## 🧩 Modul native

| Lokasi | Owner |
| --- | --- |
| `main.ts` | Bootstrap `Phaser.Game` dan snapshot debug `window.__HAT.snapshot()` |
| `game/config.ts` | Ukuran 960×540, Scale FIT, Arcade Physics, dan daftar scene |
| `game/entities/Player.ts` | Sprite Elena, body kaki 24×12, gerak, animasi, dan langkah |
| `game/systems/InputSystem.ts` | Intent keyboard dan touch per frame |
| `game/systems/SurfaceSystem.ts` | Static Arcade surfaces dan collider |
| `game/systems/InteractionSystem.ts` | Proximity, prompt, dan action object tanpa mutasi cerita |
| `game/systems/SaveSystem.ts` | Trust boundary `hat_save`, migrasi `saveVersion`, dan autosave siklus |
| `game/world/` | Definisi data 1944, Game Object dunia, dan pembuatan object |
| `game/narrative/` | Guard transisi native dan metadata batas legacy; bukan salinan dialog |
| `game/legacy/LegacyStateAdapter.ts` | Continue save 1968/1999 melalui runtime legacy |

State native yang dibagi antar-scene disimpan di registry Phaser: `saveSystem`,
`storyRunner`, `reduceMotion`, `loadErrors`, dan `nativeState`. State satu siklus memakai
`RunState`; mutasi gameplay tetap dilakukan scene/system pemilik, bukan renderer.

## 🧱 Runtime legacy

Classic-script lama tetap berada di `src/core/`, `src/data/`, `src/game/*.js`,
`src/render/`, dan `src/ui/`. Kontrak utamanya tidak berubah:

- `src/data/story.js` tetap owner dialog dan percabangan yang belum native.
- `src/game/flow.js` tetap owner state machine, mini-game, loop, dan ending legacy.
- `src/render/screens.js` tetap renderer Canvas 2D legacy melalui `POST_RENDER`.
- `src/game/main.js` tetap bootstrap halaman `legacy.html`.

Kode native tidak mengimpor global legacy. Integrasi hanya lewat data save yang
dinormalisasi dan navigasi eksplisit.

## 🛠️ Lokasi perubahan umum

| Perubahan | Mulai dari |
| --- | --- |
| Gerak/fisika 1944 | `game/entities/Player.ts`, `game/systems/SurfaceSystem.ts`, `game/world/era1944.ts` |
| Object/interaksi 1944 | `game/world/era1944.ts`, `game/world/WorldObject.ts`, `game/systems/InteractionSystem.ts` |
| HUD/touch/pause native | `game/scenes/UIScene.ts`, lalu `game/systems/InputSystem.ts` |
| Arloji native | `game/scenes/WatchRepairScene.ts` dan field terkait di `SaveSystem.ts` |
| Save/migrasi | `game/systems/SaveSystem.ts`; pertahankan kompatibilitas `hat_save` legacy |
| Dialog/rute/ending yang belum native | File `.js` legacy; cocokkan `FIRST_IDEA.md` dan `DIALOG.md` |
| Memigrasikan tantangan lampu sorot | Tambah scene/aturan native lengkap, lalu pindahkan handoff ke dialog Arthur |

Batas migrasi saat ini terjadi ketika pemain mengaktifkan lampu sorot. Native menyimpan
era 1944 dan `playerX`, lalu membuka `legacy.html?continue=1`; `src/game/main.js`
memulihkan run dan posisi itu sebelum `startWalk()`. Batas berikutnya yang dapat
dieksekusi adalah memindahkan tantangan lampu sorot secara utuh, lalu melakukan handoff
di dialog Arthur. Sampai itu lengkap, pertahankan redirect agar cerita tetap dapat
diselesaikan.

Rincian runtime ada di `../docs/ARCHITECTURE.md`; resep perubahan ada di
`../docs/AGENT_WORKFLOWS.md`.
