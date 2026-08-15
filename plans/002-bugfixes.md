# 002 — Bugfix pass: speaker bounce, era particles, tap icons, fade-in, typewriter, pause audio

- **Status**: DONE
- **Severity**: HIGH (fitur mati / kontrol sentuh mati)
- **Category**: Defects
- **Estimated scope**: 1 file (`index.html`), ~30 baris

## Fixes (semua terverifikasi di kode)

1. **Speaker bounce mati** — `drawChars` memakai `G.prog<1` padahal progres ketik hidup di `D`; `G.prog` `undefined` → `false` → pantul karakter yang bicara tak pernah memicu. → `D.prog<1`.
2. **Partikel salah era saat jalan** — state `walk` memanggil `spawnParts(` ternary rusak (kedua cabang `'1968'`, else selalu `'1944'`); jalan di 1999 mengeluarkan bara api 1944. → `spawnParts(G.era)` (selaras dengan state `dialog`).
3. **Ikon mute/pause tak bisa ditap** — `update()` membersihkan `ptr.tap` sebelum `render()`, sedangkan `drawMuteBtn`/`drawPauseBtn` membaca `ptr.tap` di render → selalu false. → pemeriksaan dua hotspot pojok dipindah ke awal `update()`; logika tap di fungsi draw dihapus.
4. **`G.fadeIn` tak pernah digambar** — diset di 3 titik transisi, tak pernah decay/render. → decay `dt*1.4` di `update()` + overlay hitam `rgba(10,8,6,fadeIn)` di `render()` di bawah white flash.
5. **Ketik dialog ~50× terlalu cepat** — `prog` adalah fraksi 0..1, ramp `dt*30*textSpd` mencapai 1 dalam 2–3 frame → efek ketik & ducking musik praktis nonaktif. → laju per-karakter: `dt*46*textSpd/max(24,len)` (46 hps pada NORMAL; SPD LAMBAT .5× / CEPAT 2×).
6. **Pause tak membisukan audio** — Esc hanya membekukan state; musik/ambience jalan terus. → `setPaused(on)`: `duckMusic(.12/.85)` + ramp `ambBus` ↔ `.04/.9*volSfx`; dipakai oleh semua jalur masuk/keluar jeda (Esc, ikon ⏸, item menu).

## Verification

- `node --check` pada isi `<script>` → OK. `qa/route.cjs golden walkqa` → `route done. errors: none`.
- Tap ikon 🔊/⏸ via pointer mengubah state; garis dialog mengetik terlihat saat NORMAL; fade-in hitam saat title→prologue.
