# Peta modul `src/`

_Referensi singkat untuk classic-script modular Hearts Across Time._

---

## 📦 Urutan load dan kontrak

Tidak ada `import` atau `export`. `index.html` memuat file berikut secara berurutan; global yang dibuat file awal dipakai file setelahnya. Mengubah urutan adalah perubahan interface.

| Urutan | File | Tanggung jawab dan simbol utama |
| ---: | --- | --- |
| 1 | `core/runtime.js` | Canvas `cv`/`ctx`, konstanta `W/H/GROUND`, utilitas, input `keys`/`pressed`/`ptr`, audio `AU`/`SFX`, state `G`/`S`, opsi `OPTS`, save `SAVE`, dan waktu `T` |
| 2 | `core/assets.js` | `PAL`, font, `ASSET_MANIFEST`, `AUDIO_MANIFEST`, loader `AS`, buffer audio, `drawCharSheet()`, `bgLayerImg()` |
| 3 | `render/characters.js` | Fallback prosedural `drawElena()` dan `drawArthur()` beserta wajah, tubuh, dan gerak karakter |
| 4 | `render/world.js` | Latar/parallax, props, interactable visual, `POSES`, `HOTSPOTS`, `LORE`, `parts`, paper UI primitives, grading, post-FX, dan fallback foreground |
| 5 | `ui/dialog.js` | `WHO`, `wrap()`, bubble/narator, choice, dan diary popup |
| 6 | `data/story.js` | `NODES`, `N()`, `say()`, pilihan/rute, ending ops, dan `arthurDiary()`; sumber naratif adalah `FIRST_IDEA.md` (sebelumnya `FIKS IDE.md`) |
| 7 | `game/flow.js` | `D`, runner operasi cerita, `G.state` update, traversal, input consumption, interactable, mini-game, save siklus, pause, ending, dan bonus |
| 8 | `render/screens.js` | Komposisi scene/HUD/screen, renderer mini-game, `render()`, pause/backlog/mute UI |
| 9 | `game/main.js` | `HeartsGameScene`, `PHASER_CONFIG`, `HAT_GAME`, hook `POST_RENDER`, intro video, visibility/audio lifecycle, dan `window.__HAT` |

## 🔗 Dependency penting

- `runtime.js` menangkap DOM/input dan membuat state; fungsi audionya memanggil helper buffer yang baru tersedia setelah `assets.js` termuat.
- `assets.js` memakai `AU`/`ac()` dari runtime dan menyediakan fallback-aware helpers untuk renderer.
- `characters.js` memakai utilitas runtime serta `PAL`, `AS`, dan `drawCharSheet()` dari assets.
- `world.js` memakai runtime/assets dan menyediakan global yang dikonsumsi flow/screens. Referensi seperti `WATCH_X` baru dievaluasi saat fungsi dipanggil setelah `flow.js` termuat.
- `dialog.js` memakai primitive kertas `sketchRR()`, `inkTag()`, dan `PAPER_COL` dari world.
- `story.js` membuat callback yang memutasi `S` ketika choice dijalankan oleh flow.
- `flow.js` mengonsumsi `NODES`, world globals, input, audio, save, dan assets; file ini adalah owner transisi gameplay.
- `screens.js` mengonsumsi seluruh layer sebelumnya. `render()` memilih cabang dari `G.state` dan menggambar langsung ke `ctx`.
- `main.js` harus terakhir karena `update()` dan `render()` harus sudah tersedia ketika Phaser dibuat.

## 🧭 Pemilik fitur

| Fitur | Owner | Pendukung |
| --- | --- | --- |
| Game flow dan state transition | `game/flow.js::update()` | `data/story.js`, `render/screens.js` |
| Capture keyboard/mouse/touch | `core/runtime.js` | `game/flow.js` mengonsumsi; `render/screens.js` menggambar kontrol sentuh |
| Rendering | `render/screens.js::render()` | `render/characters.js`, `render/world.js`, `ui/dialog.js` |
| Dialogue runner | `game/flow.js::{startNode,step,updateDialog}` | `data/story.js::NODES`, `ui/dialog.js` |
| Audio | `core/runtime.js` | manifest/buffer di `core/assets.js`; mute UI di `render/screens.js` |
| Save/load | `core/runtime.js::{SAVE,persistSave,normalizeRun}` | `game/flow.js::saveCycle()` dan `titleMenu()` |
| Story data | `data/story.js` | `FIRST_IDEA.md` untuk GDD; `DIALOG.md` sebagai referensi rinci |
| Phaser lifecycle | `game/main.js::HeartsGameScene` | flow update dan screen render |

## 🛠️ Lokasi perubahan umum

| Perubahan | Mulai dari |
| --- | --- |
| Tambah/edit dialog atau choice | `data/story.js`; cocokkan `FIRST_IDEA.md` dan `DIALOG.md` |
| Tambah/edit ending | `data/story.js`, lalu kontrak ending di `game/flow.js` dan label visual di `render/screens.js` |
| Tambah interactable/lore | Konstanta dan logic di `game/flow.js`; visual/HOTSPOTS di `render/world.js` |
| Tambah mini-game | State/start/update di `game/flow.js`; renderer di `render/screens.js`; reset/save/pause sesuai kebutuhan |
| Ubah gerak atau kontrol | Capture mentah di `core/runtime.js`; konsumsi di `game/flow.js`; touch affordance di `render/screens.js` |
| Tambah aset | `core/assets.js::ASSET_MANIFEST`, lalu jalur PNG dan fallback prosedural di renderer pemilik |
| Ubah save | Default/load/normalisasi di `core/runtime.js`; whitelist cycle di `game/flow.js::saveCycle()` |
| Ubah audio | Synth/bus/opsi di `core/runtime.js`; file opsional di `core/assets.js::AUDIO_MANIFEST` |
| Ubah lifecycle/scale/POST_RENDER | `game/main.js`; periksa overlap `core/runtime.js::fit()` dan `G.paused` |

Detail runtime, state, render, input, dan save tersedia di `../docs/ARCHITECTURE.md`. Langkah aman per jenis perubahan tersedia di `../docs/AGENT_WORKFLOWS.md`.
