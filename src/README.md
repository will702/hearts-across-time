# Struktur kode

- `core/runtime.js` — utilitas, audio, input, opsi, save, dan state global.
- `core/assets.js` — manifest, loader aset/font/audio, serta adapter spritesheet.
- `data/story.js` — seluruh node cerita dan pilihan; referensi naratif tetap `FIKS IDE.md`.
- `game/flow.js` — runner dialog, transisi state, save, pause, tas barang cerita, mini-game arloji/botol mawar/permata/foto, koleksi pecahan ending, dan update gameplay bonus.
- `render/characters.js` — renderer Elena dan seluruh versi Arthur.
- `render/world.js` — latar, parallax, properti, partikel, dan grading.
- `render/screens.js` — render scene, cover/onboarding, HUD tas, mini-game kepingan botol, pencocokan bayangan permata, perakitan foto, notifikasi barang, vortex, glitch, endcard, papan puzzle, dan epilog kota pulih.
- `ui/dialog.js` — komponen dialog, narator, pilihan, dan wrapping teks.
- `game/main.js` — konfigurasi Phaser dan lifecycle scene utama.

Urutan `<script>` di `index.html` adalah dependency graph sementara yang eksplisit. Kode sengaja
belum memakai ESM agar save, input, audio, dan seluruh node cerita dapat dipertahankan identik saat
migrasi runtime. `legacy-canvas.html` menyimpan entry point Canvas pra-migrasi sebagai pembanding QA.
