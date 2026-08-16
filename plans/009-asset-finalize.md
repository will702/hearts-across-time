# 009 — Asset Finalize: semua aset hasil generasi dipakai & tampil benar

**Severity:** MEDIUM • **Status:** DONE

## Tujuan
Memastikan setiap aset di `assets/gen/{bg,cells,fg,poses,props}` terpakai benar di dalam game
(manifest → penempatan in-game → tampilan layar), dengan QA visual penuh.

## Matriks audit (semua file gen → disposisi)

| Grup | Isi | Disposisi | Catatan |
|---|---|---|---|
| gen/cells | 8 ekspresi × 5 karakter + elena_walk1-3 + spec.json | dipakai | dicompose ke `assets/<char>_sheet.png` (compose_all.py), direferensikan ASSET_MANIFEST, dirender drawCharSheet |
| gen/bg | 11 lapis era | dipakai | bgprep → root, dirender bgLayerImg di setiap era |
| gen/bg | bg1999_far_fix + bg1999_mid_clean | dipakai | sudah jadi sumber root `bg1999_far.png`/`bg1999_mid.png` (diverifikasi visual) |
| gen/bg | bg1999_mid_v2/v3/v4, bg1999_mid/far lama | kandidat ditolak | sumber historis, sengaja dipertahankan (gitignored) |
| gen/fg | 5 occluder era | dipakai | bgprep depink+darken → root, dirender bgFgImg (walk/dialog/endcard) |
| gen/poses | 5 pose kunci | dipakai | hold→c1e/c2e, kneel→true_end+endcard, resolve→n_b1(loop≥3, filter angry), vial→r1b, reach→n_b3(hangat) |
| gen/props | 11 strip 3-frame | dipakai | PROPS per era + sampul 2088 (barrel) |

Semua path PNG di ASSET_MANIFEST (37 gambar) termuat — dicek runtime (AS.ok tanpa false).

## Temuan & perbaikan
1. **`prop_flare1944` bocor pink**: raw mengandung panel pink pastel tertutup garis tinta
   (flood_key hanya memakan magenta tersambung-ke-tepi). Fix: `scripts/fix_props_key.py`
   (estimasi hue bg dari sudut → flood tepi + blob panel terbesar per sel → alpha), lalu
   build_props.py diajari menghormati alpha sumber (4 baris).
2. **`prop_frost1999` bocor pink**: plat pink jenuh tertutup + bayangan ungu di bawah kerisi +
   uap tertint pink. Fix: mask pink global (hue dekat magenta, jaga subjek dingin), uap di-rehue
   ke biru es. Strip kini bersih.
3. **`pose_arthur_tua_reach` serpih pink**: pulau pink di pojok kanan atas tidak tertelan
   flood_key. Fix: diset sebagai magenta penuh di RGB (do_poses mengabaikan alpha sumber)
   dibatasi zona pojok (x>88%W, y<20%H) agar highlight kulit aman; rebuild via build_extra.
4. **Penempatan flare**: versi bersih tenggelam di balik band fg (api di ~55% tinggi sel).
   Dipindah ke parapet (y 444→336, h→104) — kini terbaca siluet api di atas karung pasir.
5. **Visibilitas frost**: h 66→88 agar terisi melewati pita oklusi fg.

## QA (`qa/full_assets_shots.js`, lompat-state deterministik)
15 tembakan cakupan: sampul 2088 (barrel), walk tiap era × posisi prop (flag/lantern/flare,
radio/bulb A, steam/beacon B, frost/consoleWave 1999), 5 momen pose (hold? sudah lama; resolve
loop≥3, reach hangat, kneel true_end, endcard), dialog lembar karakter. Semua lulus:
tanpa 404, tanpa PAGEERROR, tanpa sisa magenta di layar.

## Tidak diubah
- Asal warna/asset lain; sheet & lapis bg/fg rebuild byte-identik (pipeline deterministik).
- `assets/gen/` & `*_qc.png` tetap sebagai arsip sumber (gitignored).
