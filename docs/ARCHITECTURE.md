# Arsitektur Hearts Across Time

_Kontrak runtime modular Phaser 4.2.1 + Canvas 2D berdasarkan source saat ini._

---

## 🏗️ Runtime tingkat tinggi

`index.html` menyediakan canvas 960×540, overlay video intro, Phaser vendored, dan urutan classic-script. Tidak ada module loader atau build step.

```mermaid
flowchart LR
    accTitle: Runtime Phaser dan Canvas
    accDescr: Browser memuat global classic-script, Phaser memanggil update gameplay setiap frame, lalu renderer Canvas menggambar pada event POST_RENDER.

    browser[Browser memuat index.html] --> scripts[Classic scripts berurutan]
    scripts --> phaser[Phaser.Game dan HeartsGameScene]
    phaser --> frame_update[update now delta]
    frame_update --> game_update[flow update dt]
    phaser --> post_render[POST_RENDER]
    post_render --> canvas_render[screens render ke ctx]

    classDef runtime fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a5f
    classDef render fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#3b0764
    class phaser,frame_update,game_update runtime
    class post_render,canvas_render render
```

`HeartsGameScene.update()` membatasi delta ke 0–0,05 detik. `drawGame()` memanggil `render()` setelah render Phaser. `window.__HAT` mengekspos referensi debug ke game, scene, `G`, `S`, `D`, dan `AS`; bukan API save atau integrasi stabil.

Ownership runtime tetap hibrida:

- Phaser memiliki scene lifecycle, clock frame, canvas game, Scale FIT/CENTER_BOTH, dan `POST_RENDER`.
- `runtime.js::fit()` masih menulis ukuran CSS canvas pada resize.
- `G.paused`/`setPaused()` membekukan update gameplay dan men-duck audio; Phaser scene tetap aktif.
- `visibilitychange` di `main.js` menangguhkan/melanjutkan WebAudio sesuai visibilitas dan pause.

## 🔄 State machine

`G.state` adalah discriminator utama. `src/game/flow.js::update()` memutasi state; `src/render/screens.js::render()` memilih tampilan dari nilai yang sama.

```mermaid
stateDiagram-v2
    accTitle: Siklus State Game
    accDescr: State utama bergerak dari load dan title menuju tiga era, lalu bercabang ke loop gagal, true ending, atau bonus setelah koleksi ending lengkap.

    [*] --> Load
    Load --> Title: aset selesai
    Title --> GameIntro: siklus baru
    Title --> Walk: lanjutkan autosave
    Title --> Bonus: enam ending lengkap
    GameIntro --> Prologue
    Prologue --> Vortex

    state EraCycle {
        [*] --> EraIntro
        EraIntro --> Walk
        Walk --> RequiredGame: interactable atau challenge
        RequiredGame --> Walk: selesai
        Walk --> Dialog: mencapai Arthur
        Dialog --> Vortex: era berikutnya
        Vortex --> EraIntro
    }

    Vortex --> EraCycle: menuju 1944
    EraCycle --> PuzzleAward: operasi ending
    PuzzleAward --> Glitch: ending gagal
    Glitch --> Vortex: reset ke 1944
    PuzzleAward --> EndCard: true ending
    EndCard --> Title
    Bonus --> BonusEnd
    BonusEnd --> Title
```

`EraIntro` mewakili `warintro`, `bunkerintro`, `labintro`, atau `finallabintro`. `RequiredGame` mewakili `challenge`, `watchrepair`, `rosepuzzle`, `gemalign`, atau `photopuzzle`. `walk` juga dapat ditahan modal `G.diary` atau `G.lore` tanpa mengganti `G.state`.

Pause bukan state machine terpisah: `G.paused` menginterupsi hampir semua state interaktif dan mengarahkan frame ke `updatePause()`/`drawPause()`.

## 🔗 Dependency modul

```mermaid
flowchart TB
    accTitle: Dependency Classic Script
    accDescr: Urutan load menghasilkan global bersama dari runtime sampai bootstrap Phaser; garis putus-putus menandai referensi deferred yang baru dipakai setelah seluruh script termuat.

    runtime[core/runtime.js] --> assets[core/assets.js]
    assets --> characters[render/characters.js]
    assets --> world[render/world.js]
    world --> dialog[ui/dialog.js]
    runtime --> story[data/story.js]
    story --> flow[game/flow.js]
    world --> flow
    characters --> screens[render/screens.js]
    dialog --> screens
    flow --> screens
    screens --> main[game/main.js]
    runtime -.->|helper audio deferred| assets
    world -.->|konstanta flow deferred| flow

    classDef core fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a5f
    classDef game fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d
    classDef view fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#3b0764
    class runtime,assets core
    class story,flow,main game
    class characters,world,dialog,screens view
```

Ini bukan dependency graph ESM. Semua simbol berada di global lexical scope classic-script; reorder, rename global, atau menambah `type="module"` dapat memutus runtime.

## 🧠 State ownership dan mutasi

| Store | Owner utama | Umur dan aturan |
| --- | --- | --- |
| `G` | `core/runtime.js`, dimutasi `game/flow.js` | State scene/UI sementara. Setter/transisi baru ditempatkan di flow, bukan renderer |
| `S` | `core/runtime.js`, dimutasi choice/flow | Data satu siklus; affinity, route, loop, challenge, inventory, puzzle wajib |
| `D` | `game/flow.js` | Cursor dan presentasi dialog aktif; `step()` satu-satunya interpreter operasi cerita |
| `SAVE` | `core/runtime.js` | Progres lintas sesi dan `SAVE.game`; persist hanya melalui `persistSave()` |
| `OPTS` | `core/runtime.js` | Opsi user lintas sesi; persist melalui `saveOpts()` |
| `AS` | `core/assets.js` | Hasil load image/font; error aset valid dan mengaktifkan fallback |
| `AU` | `core/runtime.js` | WebAudio context, bus, ambience, buffer; dibuat setelah gesture |
| `T` | `core/runtime.js`/flow | Waktu global detik yang bertambah saat `update()` aktif |
| `LOG`, `ECHO` | `game/flow.js` | Riwayat dialog dan jejak loop selama tab hidup; tidak disimpan |

Aturan baru: input menghasilkan intent, flow memutasi state, renderer membaca state. Jangan menambah write ke `G`, `S`, `SAVE`, atau `OPTS` dari fungsi draw.

Pengecualian legacy saat ini:

- `drawParts(c, 1/60)` memajukan dan menghapus `parts` pada render, sehingga kecepatan partikel bergantung frame render.
- `drawLensRain()` memindahkan `lensDrops` dan dapat mengacak posisi reset.
- `poseFade()` menulis timestamp awal ke `D._poseBorn`.
- `drawLog()` meng-clamp `G.logScroll`.

Jangan memperluas pola ini. Diagnosis frame-rate/render harus mempertimbangkan pengecualian tersebut.

## 🎨 Rendering pipeline

Urutan umum `render()`:

1. Simpan context, terapkan shake bila motion aktif, lalu clear canvas.
2. Pilih branch layar dari `G.state`.
3. Untuk `walk`/`dialog`, gambar background dan props melalui `drawScene()`, karakter, loop ghost, foreground PNG atau `fgSilhouette()`, grade, lalu post-FX.
4. Gambar indikator/interactable, caption, dialogue/choice, touch controls, loop HUD, inventory, dan toast di atas dunia.
5. Gambar overlay global: backlog, fade, white flash, pause, pause/mute buttons.
6. Restore context. Phaser menampilkan canvas yang sama setelah `POST_RENDER` selesai.

Kontrak fallback:

- `drawCharSheet()` false → `drawElena()`/`drawArthur()` prosedural.
- `bgLayerImg()` false → fungsi background prosedural tetap menggambar layer.
- `bgFgImg()` false → `fgSilhouette()`.
- Ilustrasi puzzle/cover/vortex harus memiliki bentuk prosedural atau komposisi lama; potret opsional boleh tidak digambar.
- Audio file gagal → fetch error ditelan; SFX yang mendukungnya memakai synth/noise fallback, ambience file boleh senyap.

`OPTS.reduceMotion` harus menghasilkan frame stabil tanpa menghapus informasi, state, atau kontrol. Matikan atau batasi camera drift/zoom, bob, mouth flap, shake, RGB split, moving scanlines, rain particles, pulse, dan transisi non-esensial. Video `intro.mp4` tetap prarender dan tidak diubah oleh opsi ini.

## 💾 Save dan load

```mermaid
flowchart LR
    accTitle: Lifecycle Save Lokal
    accDescr: Save permanen dan opsi dimuat dari localStorage, autosave siklus dibuat saat traversal, lalu Continue menormalisasi data lama sebelum memulai era tersimpan.

    storage[(localStorage)] --> defaults[Default SAVE dan OPTS]
    defaults --> merge[Object.assign data tersimpan]
    merge --> title[Menu title]
    title -->|Lanjutkan| restore[Assign SAVE.game.S]
    restore --> normalize[normalizeRun]
    normalize --> start_walk[startWalk era]
    start_walk --> cycle_save[saveCycle]
    cycle_save --> storage
    title -->|Siklus baru| clear_cycle[Hapus SAVE.game]
    clear_cycle --> storage
    cycle_save -->|Ending atau glitch| clear_cycle
```

- `hat_save` memuat `seen`, `chosen`, `game`, `endings`, `inspected`, `introDone`, `tutorial`, dan key tambahan yang sudah ada seperti bonus/lore.
- `SAVE.game` hanya memuat `era` dan subset `S` yang di-whitelist `saveCycle()`.
- `normalizeRun()` mengisi challenge/inventory default dan meng-upgrade completion item dari save lama secara defensif.
- Ending/glitch menghapus `SAVE.game` agar Continue tidak menghidupkan kembali siklus selesai/runtuh.
- Tidak ada `saveVersion` pada source saat ini. Field baru wajib punya default, normalisasi save lama, dan migrasi eksplisit bila arti key berubah.

## ⌨️ Input keyboard dan touch

```mermaid
flowchart LR
    accTitle: Alur Input Bersama
    accDescr: Event DOM mengisi state input global, flow mengonsumsinya sesuai state aktif, dan renderer hanya menggambar affordance keyboard atau touch yang sesuai.

    keyboard[DOM keydown dan keyup] --> key_state[keys dan pressed]
    pointer[Mouse dan touch events] --> pointer_state[ptr x y down tap]
    key_state --> flow_update[flow update]
    pointer_state --> flow_update
    flow_update --> mutate[Mutasi G S D SAVE]
    mutate --> render_ui[Render world dan UI]
    flow_update --> clear[Clear ptr.tap dan pressed]
```

- `keys` menyimpan hold; `pressed` dan `keyOnce()` menyimpan edge satu frame.
- `ptr.down` menyimpan hold; `ptr.tap` adalah edge dan selalu dibersihkan pada akhir `update()`.
- `cvXY()` memetakan pointer dari ukuran CSS canvas ke koordinat 960×540.
- Input state-specific dikonsumsi di `flow.js`; kontrol touch yang tampak digambar di `screens.js` memakai hit area yang sama.
- Tombol mute/pause disentuh dalam `update()` sebelum `ptr.tap` dibersihkan. Tombol `M` juga dikonsumsi `HeartsGameScene.update()` sebelum flow.
- Menambah kontrol wajib menjaga keyboard dan touch parity serta tidak membuat beberapa consumer memakai edge yang sama tanpa urutan eksplisit.
