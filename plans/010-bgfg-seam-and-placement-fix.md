# 010 — Perbaikan Seam BG/FG & Penempatan Aset

**Severity:** MEDIUM • **Status:** DONE

## Temuan (audit piksel + QA visual, bukan regenerasi)

1. **Bug pipeline `seam_blend`** (`scripts/build_sheets.py`): rumus lama tidak pernah
   menyamakan kolom 0 dengan kolom w-1 — junction tile tetap melompat penuh, sementara
   konten tepi justru diduplikasi (ghosting) ke interior strip. Terukur `seamdiff`
   (deltaRGB kolom 0 vs w-1 per baris): 10 layer bg 52–344 + `bg1968A_fg` 138.
2. **Seam fg nyaris tampil di layar**: `bgFgImg` menggambar tile selebar `dw≈1108px`
   (1920 diskalakan ke h150) dengan parallax 1.18 → junction menyapu layar pada
   camX>126 (hampir sepanjang jalan). `bg1968A_fg` (138) meninggalkan tepi vertikal
   samar; layer fg lain kebetulan tepinya seragam gelap (8–21) sehingga tak terlihat.
3. **Seam bg laten**: rute normal tak pernah membungkus layer bg (factor ≤.5, camX ≤840),
   KECUALI sampul judul yang pan 9px/s — `bg2088_near` (269) wrap setelah ±4 menit idle
   dan junction menyapu layar.
4. **Bohlam 1968A menggantung tanpa tiang**: kordel mulai y≈155 sementara langit-langit
   gelap berakhir y≈110 → gap 45px "menggantung dari udara" (verifikasi piksel kolom
   kordel + konfirmasi vision zoom).
5. Verifikasi negatif (tidak diubah): flare 1944 duduk benar di parapet; frost 1999
   grounded & putih-biru (bukan pink — klaim vision = false positive); poster/barrel 2088
   menempel; steam 1968B menempel panel; pose 5 momen kunci grounded; 0 piksel magenta
   di 15+ tembakan; deteksi garis vertikal (run-length kolom) hanya menemukan tepi objek.

## Perbaikan

- **`scripts/build_sheets.py`** — `seam_blend` ditulis ulang: crossfade kiri↔kanan
  (kolom 0 mewarisi konten tepi kanan, kolom w-1 mewarisi tepi kiri) + **ramp koreksi
  24px** yang menggeser kolom 0 persis ke kolom w-1 → junction tertutup matematis.
- **`scripts/fix_bg_seams.py` BARU** — menerapkan `seam_blend` terkoreksi langsung ke
  PNG final (frac .083 ≈ bw 160px, lebih sempit dari blend bgprep lama agar ghosting
  tak menumpuk); cetak seamdiff sebelum→sesudah; `--qc` menghasilkan pasangan tile.
  Dipakai pada: `bg1944_far/mid, bg1968A_far/mid, bg1968B_mid, bg1999_far/mid,
  bg2088_far/mid/near, bg1968A_fg` — **semua seamdiff → 0.0**; QC junction (crop
  tengah pair) dinyatakan mulus tanpa garis keras/objek terpotong.
- **`index.html`** — `prop_bulb1968A` y 238→200: kordel (top y≈92) kini menembus
  langit-langit gelap; run gelap menerus y40–157 terverifikasi piksel.

## QA

- `qa/full_assets_shots.js` (15 tembakan): semua manifest termuat, NO CONSOLE/PAGE
  ERRORS, 0 magenta.
- `qa/route.cjs golden` + `failA`: lolos tanpa error (skrip kini `channel:'chrome'`
  karena bundle chromium Playwright tak terpasang lokal).
- Uji spesifik: junction fg 1968A di x=789 (pemain digeser agar tak menutupi) kini
  dalam rentang noise interior; sampul dipaksa T=180 (kamera 1620) → junction
  near-layer x=543 bersih, anomali kolom tinggal siluet ensemble (fitur sampul).

## Catatan

- `qa/route.cjs` & `qa/shoot.cjs`: `chromium.launch({channel:'chrome'})`.
- Fallback prosedural tak tersentuh (perubahan hanya lapisan PNG + konstanta y prop).
