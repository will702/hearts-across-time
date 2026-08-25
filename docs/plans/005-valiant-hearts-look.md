# 005 — Valiant Hearts Look Pass

| Severity | Status |
|---|---|
| MEDIUM | DONE |

Goal: presentasi game dibaca seperti *Valiant Hearts: The Great War* — komik perang
digambar tangan — tanpa menyentuh gameplay, dialog, percabangan, audio, atau aset PNG lukis.

## Yang dikerjakan (semua di `index.html` + 1 aset font baru)

1. **Tipografi tulisan tangan** — Patrick Hand (SIL OFL) di `assets/fonts/` (latin + latin-ext,
   unicode-range ala Google Fonts), dimuat via `FontFace` dalam loader aset; fallback mulus.
   Semua UI teks pindah ke `F_UI`; monospace dipertahankan untuk tahun vortex & penghitung loop.
2. **Kit kertas & tinta** — kanvas `PAPER` 256px pre-render (butir, serat, noda; seeded) +
   `sketchRR()` (isi kertas + clip tekstur + goresan tinta ganda dengan jitter deterministik dari
   hash geometri panel — stabil antar frame) + `inkTag()`.
3. **Restyle UI** — balon kata (`drawBubble`), strip narator (`drawNarr`), panel pilihan
   (`drawChoices`), jeda (`drawPause`), backlog (`drawLog`): kertas krem, tinta `#2B211A`,
   aksen merah `#94342E`; chip nama/tag jadi cap tinta; warna chip dilembutkan (`WHO`, `tagEmp/Log/R`).
4. **Caption babak komik** — kotak kertas kiri atas + aksen gores merah (menggantikan pita gelap).
5. **`fgSilhouette()`** — occluder dekat kamera (parallax ×1.18, seeded, tile 1920 mulus):
   strip tanah tak rata + konten per era (kawat berduri/tunggul 1944; lempeng/rebar 2088;
   rantai/peti 1968A; pipa/kabel 1968B; pilar/kabel 1999). Dipanggil setelah `drawChars`,
   sebelum `grade`, pada state walk/dialog/glitch.
6. **`hazeBand()`** — kabut antar-lapisan (2088, 1944, 1968A/B, 1999).
7. **`grade()` v3** — serat kertas multiply (.09) + lift krem overlay (.07) + vignette (.38) +
   4 sudut gelap "panel cetak" + grain animasi (tetap).
8. **Polish era** — langit 1944 mendung oker + matahari berasap lembut + asap tipis; tanah 1944
   berbingkai tinta (sisi papan, bibir genangan, serpih); lantai 1999 grate biru-kelabu + sambungan
   pelat; sambungan lantai tinta 1968 A/B.
9. **Sampul/kartu komik** — bingkai ganda di judul & endcard; font judul mengikuti; favicon data-URI
   (menghilangkan 404 konsol).

## Verifikasi
- `qa/vh_shots.js` (Playwright + Chrome sistem, sadar-state via `G`/`D`/`S` di `page.evaluate`):
  rute golden penuh (Empati×2 → 1B → 2B2 → Ikhlas → TRUE END) & rute gagal (Logika → 1A → 2A1 →
  glitch) — screenshot `qa/vh_*.png`, 0 console/page error, font terkonfirmasi termuat
  (`document.fonts.check`). Review visual per adegan: caption box, bubble, pilihan, jeda, backlog,
  endcard, siluet depan.
