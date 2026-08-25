# Peta modul `src/`

_Referensi singkat untuk runtime produksi Phaser-native Hearts Across Time._

---

## 📦 Satu runtime produksi

`index.html` adalah satu-satunya entry produksi. Vite memuat `src/main.ts`, lalu
TypeScript/ESM membuat `Phaser.Game` dan mendaftarkan seluruh scene dari
`game/config.ts`.

Seluruh perjalanan 1944/1968/1999, dialog dan rute, mini-game, loop, enam ending,
true ending, serta bonus 2088 berjalan di scene TypeScript. `legacy/index.html` dan
classic-script `.js` tetap tersedia sebagai referensi/parity regression, tetapi tidak
diimpor oleh runtime native dan tidak disalin ke `dist/`.

Sumber kebenaran produksi:

- Runtime dan scene: `main.ts` serta file `.ts` di `game/`.
- Narasi aktif: `game/narrative/storyScript.ts`, dicocokkan dengan `docs/design/FIRST_IDEA.md`
  dan `docs/design/DIALOG.md`.
- Referensi historis: seluruh runtime classic-script di `legacy/`.

## 🎬 Scene Phaser-native

| Kelompok | Scene | Tanggung jawab |
| --- | --- | --- |
| Fondasi | `BootScene`, `PreloadScene` | Membuat service, menormalisasi save/opsi, memuat aset, dan menyediakan fallback |
| Presentasi | `IntroScene`, `TitleScene`, `PrologueScene` | Intro, sampul/menu/Continue, dan pembuka cerita |
| UI/narasi | `UIScene`, `DialogueScene` | HUD, touch, pause, dialog, pilihan, backlog, dan interpretasi operasi cerita |
| Era | `Era1944Scene`, `Era1968Scene`, `Era1999Scene` | World, pemain, kamera, interaksi, autosave, dan transisi naratif tiap era |
| Mini-game 1944 | `WatchRepairScene`, `SpotlightChallengeScene` | Perbaikan arloji dan rekonstruksi rute patroli |
| Mini-game 1968 | `RosePuzzleScene`, `SignalTuneScene`, `DiaryScene` | Susun vas mawar, dekripsi transmisi, dan buku harian |
| Mini-game 1999 | `GemAlignScene`, `PhotoPuzzleScene`, `CryoBalanceScene` | Pencocokan bayangan permata, foto khusus era Arthur tua, dan stabilisasi krio |
| Transisi/hasil | `VortexScene`, `GlitchScene`, `PuzzleAwardScene`, `EndCardScene` | Lompatan era, reset loop, enam pecahan ending, dan true ending |
| Bonus | `Bonus2088Scene` | Epilog kota pulih dan lima simpul kenangan |

`game/config.ts` adalah satu-satunya daftar scene produksi. Tambahkan scene di sana
hanya setelah lifecycle, input, pause, save/resume, fallback, reduced motion, dan QA-nya
lengkap.

## 🧩 Modul TypeScript

| Lokasi | Owner |
| --- | --- |
| `main.ts` | Bootstrap `Phaser.Game` dan snapshot `window.__HAT.snapshot()` |
| `game/config.ts` | Ukuran 960×540, Scale FIT, Arcade Physics, dan daftar scene |
| `game/entities/Player.ts` | Sprite Elena, body kaki, gerak, animasi, shadow, dan langkah |
| `game/systems/InputSystem.ts` | Intent keyboard dan touch per frame |
| `game/systems/SurfaceSystem.ts` | Static Arcade surfaces dan collider |
| `game/systems/InteractionSystem.ts` | Proximity, prompt, dan action object tanpa mengambil alih cerita |
| `game/systems/SaveSystem.ts` | Trust boundary `hat_save`, `saveVersion: 2`, normalisasi, dan autosave |
| `game/world/` | Definisi data 1944/1968/1999, Game Object dunia, dan factory |
| `game/narrative/storyScript.ts` | Dialog, pilihan, rute, operasi walk/vortex, dan enam ending |
| `game/minigames/` | Aturan matematis/bonus murni untuk unit test |
| `game/audio/SoundManager.ts` | Musik, ambience, SFX, mute, dan ducking |

Service/opsi lintas scene disimpan di registry Phaser: `saveSystem`,
`soundManager`, `options`, `reduceMotion`, `loadErrors`, dan `nativeState`.
State satu siklus memakai `RunState`; scene gameplay tetap owner mutasinya.

## 🛠️ Lokasi perubahan umum

| Perubahan | Mulai dari |
| --- | --- |
| Gerak/fisika era | `game/entities/Player.ts`, `game/systems/SurfaceSystem.ts`, dan definisi `game/world/era*.ts` |
| Object/interaksi | Definisi era, `game/world/WorldObject.ts`, lalu `game/systems/InteractionSystem.ts` |
| HUD/touch/pause | `game/scenes/UIScene.ts`, lalu `game/systems/InputSystem.ts` |
| Dialog/rute/ending | `game/narrative/storyScript.ts` dan `game/scenes/DialogueScene.ts` |
| Mini-game | Scene pemilik dan aturan murni di `game/minigames/` bila dapat dipisahkan |
| Save/migrasi | `game/systems/SaveSystem.ts`; pertahankan key `hat_save` dan kompatibilitas versi |
| Audio | `game/audio/SoundManager.ts`; scene hanya meminta ambience/music/SFX semantik |
| Loader/fallback | `game/scenes/PreloadScene.ts` |
| Loop/pecahan/akhir | `GlitchScene`, `PuzzleAwardScene`, `EndCardScene`, dan `TitleScene` |
| Bonus 2088 | `Bonus2088Scene.ts` dan `game/minigames/bonusRules.ts` |

## 🧱 Referensi classic-script

Runtime lama dipertahankan untuk membandingkan aturan/presentasi melalui
`npm run qa:legacy`. Ia bukan fallback produksi, bukan target Continue, dan tidak
boleh menerima fitur baru kecuali tugas secara eksplisit menargetkan parity regression.
Jika referensi dan TypeScript berbeda, source TypeScript menentukan perilaku produk;
gunakan GDD/dialog untuk menilai ketidaksesuaian naratif.

Rincian runtime ada di `../docs/ARCHITECTURE.md`; resep perubahan ada di
`../docs/AGENT_WORKFLOWS.md`.
