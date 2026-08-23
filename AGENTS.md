@/Users/willson/.codex/RTK.md

# AGENTS.md — Hearts Across Time — Break The Loop

_Panduan kerja untuk agen coding. Fakta arsitektur di bawah mengikuti source saat ini, bukan rencana historis._

---

## 📚 Urutan sumber kebenaran

1. `index.html` dan `src/` menentukan arsitektur serta perilaku produksi.
2. `FIRST_IDEA.md` adalah nama saat ini dari `FIKS IDE.md` dan tetap menjadi sumber kebenaran GDD/naratif. `DIALOG.md` adalah referensi dialog yang lebih rinci, bukan pengganti source produksi.
3. `README.md`, `src/README.md`, dan `docs/` menjelaskan implementasi saat ini.
4. `plans/` hanya menyimpan riwayat pass. Rencana berstatus DONE tidak mengalahkan source.

Jika dokumen dan kode berbeda, dokumentasikan serta pertahankan perilaku kode kecuali developer secara eksplisit meminta perubahan. Untuk perubahan cerita, cocokkan `FIRST_IDEA.md`, `DIALOG.md`, dan `src/data/story.js`; jangan mengarang dialog atau cabang baru.

## 🏗️ Arsitektur saat ini

Game adalah aplikasi browser 960×540 tanpa build step, bundler, package manifest, atau ESM. `index.html` adalah entry point tipis yang memuat Phaser 4.2.1 vendored dan sembilan classic script dalam urutan tetap.

- Phaser `HeartsGameScene` memiliki lifecycle scene dan frame timing. `update(now, delta)` membatasi `dt` ke 0,05 detik lalu memanggil `update(dt)`.
- Renderer Canvas 2D menggambar ke canvas Phaser pada event `Phaser.Core.Events.POST_RENDER` melalui `render()`.
- Scaling memakai `Phaser.Scale.FIT`/`CENTER_BOTH`, tetapi `src/core/runtime.js::fit()` masih mengatur ukuran CSS canvas saat resize. Keduanya aktif.
- Pause gameplay memakai `G.paused` dan `setPaused()`; scene Phaser tidak di-pause. Saat tab tersembunyi, Phaser menangani tick dan `src/game/main.js` menangguhkan WebAudio.
- Modul berbagi global classic-script; tidak ada `import`/`export`. Urutan `<script>` di `index.html` adalah dependency graph dan interface internal.

Urutan produksi:

1. `vendor/phaser.min.js`
2. `src/core/runtime.js`
3. `src/core/assets.js`
4. `src/render/characters.js`
5. `src/render/world.js`
6. `src/ui/dialog.js`
7. `src/data/story.js`
8. `src/game/flow.js`
9. `src/render/screens.js`
10. `src/game/main.js`

Jangan mengubah urutan tanpa menelusuri semua global yang diproduksi dan dikonsumsi. Beberapa referensi sengaja deferred: fungsi di `runtime.js` memakai helper aset setelah semua script termuat, sedangkan fungsi dunia memakai konstanta flow ketika baru dipanggil.

## 🗂️ Tanggung jawab modul

| Direktori | Tanggung jawab |
| --- | --- |
| `src/core/` | Canvas/context, utilitas, input mentah, state global, opsi, localStorage, WebAudio, manifest dan loader aset |
| `src/data/` | `NODES`, operasi cerita, pilihan, dan isi buku harian |
| `src/game/` | Runner dialog, state machine, traversal, interactable, mini-game, save siklus, pause, bonus, dan bootstrap Phaser |
| `src/render/` | Karakter, dunia, fallback prosedural, efek, seluruh layar/HUD, dan fungsi `render()` |
| `src/ui/` | Bubble dialog, narator, choice, diary popup, dan text wrapping |

Peta file dan dependency rinci ada di `src/README.md`; runtime/state/render/save flow ada di `docs/ARCHITECTURE.md`; resep perubahan umum ada di `docs/AGENT_WORKFLOWS.md`.

## 🎮 State dan pemilik data

- `G`: state scene/UI sementara, termasuk `G.state`, player, kamera, active mini-game, pause, dan transisi.
- `S`: state satu siklus: empathy/logic, route, loop, challenge, inventory, dan completion item wajib.
- `D`: runner dialog aktif; hanya `src/game/flow.js` yang memajukan operasi `NODES`.
- `SAVE`: progres permanen dan autosave siklus yang disimpan sebagai `hat_save`.
- `OPTS`: opsi aksesibilitas/audio/teks yang disimpan sebagai `hat_opts`.
- `AS`/`AU`: registry aset dan runtime audio; `T` adalah waktu global; `LOG` dan `ECHO` hanya hidup selama sesi.

Mutasi gameplay harus berada di update/flow. Jangan menambah mutasi baru pada renderer. Ada pengecualian legacy yang harus dipahami sebelum debugging: `drawParts()` memajukan partikel dengan `1/60`, `drawLensRain()` memindahkan tetes hujan, `poseFade()` menginisialisasi `D._poseBorn`, dan `drawLog()` meng-clamp `G.logScroll`.

## ▶️ Menjalankan dan deploy

Gunakan server lokal agar script, font, video, dan aset dimuat konsisten:

```sh
python -m http.server 8777
# buka http://127.0.0.1:8777/index.html
```

Deploy itch.io harus memuat `index.html`, `src/`, `vendor/`, dan `assets/`. Tidak ada langkah build. `phaser-demo.html` dan `legacy-canvas.html` telah dihapus dan hanya relevan sebagai sejarah git; jangan pulihkan atau pakai sebagai referensi implementasi.

## 🎨 Aset dan fallback

- `ASSET_MANIFEST` di `src/core/assets.js` adalah registry gambar opsional; loader font berada di file yang sama. Error ditandai lalu loading tetap berlanjut ke title.
- Karakter harus mencoba `drawCharSheet()` lalu tetap memiliki gambar prosedural di `drawElena()`/`drawArthur()` bila fungsi mengembalikan `false`.
- Latar/foreground harus mencoba `bgLayerImg()`/`bgFgImg()` lalu memakai renderer prosedural seperti `fgSilhouette()` bila aset absen.
- Aset audio eksternal boleh gagal senyap; WebAudio prosedural tetap menjadi fallback bila tersedia. Potret opsional boleh di-skip.
- Semua motion baru wajib menghormati `OPTS.reduceMotion`. Sisakan informasi dan input yang sama; matikan bob, shake, parallax motion, flap, glitch, atau pulse yang tidak esensial.
- Gaya seni tetap watercolor-storybook, tile horizontal seamless, jangkar bawah, dan sheet karakter menghadap kanan. Jangan regenerate atau mengubah aset saat pass dokumentasi/fitur lain.

Pipeline Python berada di `scripts/`: `gen_image*.py`/`gen_*.py` menghasilkan bahan mentah ke `assets/gen/`, lalu `build_sheets.py`, `compose_all.py`, `build_props.py`, atau `build_extra.py` menghasilkan aset final. Developer manusia menguji pipeline; agen tidak menjalankan regenerasi tanpa permintaan eksplisit.

## 🔒 Keamanan dan git

- `.env` berisi API key dan di-gitignore. Jangan membaca nilainya ke output, mencetak, menyimpan, atau commit file tersebut.
- Jangan commit `.env`, `.venv/`, `node_modules/`, `assets/gen/`, `qa/`, log, cache Python, atau screenshot.
- Pertahankan kredit CC0 audio di `README.md` dan lisensi SIL OFL font di `assets/fonts/`.
- Gunakan Conventional Commits berbahasa Inggris dan satu pass per commit bila developer meminta commit.
- Pertahankan perubahan milik user; periksa status/diff sebelum mengedit dan stage hanya path yang diminta.

## 🧪 Kebijakan QA

Seluruh Playwright, screenshot, inspeksi visual, playtest, console/404 check, route verification, dan persetujuan akhir adalah milik developer manusia. Agen hanya mengimplementasikan atau memperbaiki fitur dan dokumentasi, kecuali developer secara eksplisit meminta QA tertentu.

Folder `qa/` di-gitignore dan tidak tersedia dalam checkout ini; perintah QA lama di riwayat dokumentasi bukan kontrak yang bisa diasumsikan berjalan. Saat menyerahkan perubahan, nyatakan bahwa gameplay/visual belum diverifikasi oleh agen.

## ✍️ Konvensi perubahan

- Semua teks in-game dan dokumentasi proyek memakai Bahasa Indonesia; nama simbol mengikuti source.
- Pertahankan classic-script modular dan gaya JS padat; jangan migrasi framework, menambah bundler, memecah ke ESM, atau melakukan reformat massal.
- Perubahan cerita berada di `src/data/story.js`; perubahan flow/input/save di `src/game/flow.js`; render di `src/render/`; capture input/audio/state dasar di `src/core/runtime.js`; Phaser bootstrap di `src/game/main.js`.
- Saat menambah field save, beri default aman, normalisasi save lama di `normalizeRun()`, dan tambahkan ke whitelist `saveCycle()` bila termasuk autosave siklus. Jangan rename/hapus key tanpa migrasi.
- Saat menambah state, lengkapi start/update di `flow.js`, render branch di `screens.js`, reset/pause/input yang relevan, serta fallback dan reduced-motion bila visual.
- Jangan mengubah gameplay, dialog, visual, balance, atau production code dalam pass dokumentasi.
