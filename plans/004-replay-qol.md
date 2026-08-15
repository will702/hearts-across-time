# 004 — Replay QoL: loop pacing, backlog, endings tracker, loop dialogue, mixer, aksesibilitas, touch parity

- **Status**: DONE
- **Severity**: MEDIUM (standar genre VN + retensi replay)
- **Category**: Systems / UX
- **Estimated scope**: 1 file (`index.html`) + key SAVE/OPTS baru yang aditif

## Changes

1. **Pacing loop (C1)** — `loop>0`: lari jadi kecepatan bawaan; Shift berbalik jadi "jalan pelan". Hint di bawah HUD loop memberi tahu pemain. Corridor, trigger, dan kamera tak disentuh.
2. **Backlog dialog (C2)** — `LOG` ring-buffer 30 entri diisi di `step()`; TAB/B membuka overlay (gulir ↑↓, ESC/klik menutup; input dialog lain terkunci selama terbuka; Esc tak lagi salah-membuka pause karena guard `!G.logOpen`). Tab ditambahkan ke daftar `preventDefault`.
3. **Endings tracker (C3)** — `SAVE.endings` aditif; `markEnd()` dipanggil dari `startNode` (paradox/rebut/true) dan `startGlitch` (A1/B1/B2lock — rute A2 melewati node). Layar judul menampilkan "⏳ ENDING TERUNGKAP n/6 (★ sejati)".
4. **Dialog sadar-loop (C4)** — `n_b1`: varian déjà-vu bertingkat (loop 1 / 2 / ≥3) + reaksi Arthur Muda pada loop≥2; `n_b2`: satu baris "tatapanmu seperti sudah menyaksikan semua ini" pada loop≥2.
5. **Mixer audio (C5)** — `OPTS.volMus`/`OPTS.volSfx` (aditif, default 1). `duckMusic` mengalikan `volMus`; `applyVol` mengatur sfxBus + ambBus (base `.9·volSfx`, hormati ducking jeda); baris MUSIK / EFEK & AMBIENSI di menu jeda.
6. **Aksesibilitas (C6)** — `OPTS.reduceMotion` mematikan shake, glitch-strip/ghost/difference, denyut jantung prolog, skyFlash, RGB-split vortex, white-out akhir vortex (white flash global dibatasi 30%), nafas kamera; trigger `boom` meng-enolkan shake & membatasi flash. `OPTS.textScale` (NORMAL/BESAR) menskalakan font + line-height bubble & panel narator.
7. **Touch parity (C7)** — tombol lari ≫ (hold) di atas ▶ dengan zona terpisah dari ◀ ▶; label penyesuai menu jeda sudah membawa penanda ‹ › yang terlihat.

## Boundaries

- Save keys hanya ditambah (`endings`, `volMus`, `volSfx`, `textScale`, `reduceMotion`) — blob `hat_save`/`hat_opts` lama tetap ter-parse.
- Tidak mengubah NODES cerah (teks asli verbatim tetap), hanya menambah baris bercabang pada `n_b1`/`n_b2`.

## Verification

- `node --check` OK; `qa/route.cjs golden walkqa` → `route done. errors: none`.
- Headless: TAB membuka backlog berisi baris prolog; restart loop kedua (rute gagal) menampilkan varian n_b1 loop-2 + tally "1/6" di judul; slider EFEK menurunkan gain sfxBus (AnalyserNode); ikon mute/pause berfungsi via pointer.
