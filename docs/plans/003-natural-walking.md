# 003 — Natural walking: elliptical step arcs, cloth follow-through, accel pitch

- **Status**: DONE
- **Severity**: HIGH (koreksi sisa rigor dari 001 — on-screen ~60% runtime)
- **Category**: Physicality / animation principle
- **Estimated scope**: 1 file (`index.html`), ~25 baris

## Problem (sisa dari 001)

001 memberi fisika (kecepatan → irama), tapi pose-nya masih "meluncur": kaki hanya geser horizontal dengan tinggi tapak konstan (`y=-3`), gaun & rambut bergoyang **se-fase** dengan langkah (tanpa follow-through), jalur PNG tak punya rotasi badan, dan tidak ada bacaan akselerasi pada tubuh.

## Changes (001 tetap utuh: fase dari |vx|, stride scaling, turn squash, debu & SFX π-crossing)

1. **Langkah elips ayun/tumpu** (`drawElena`): `lx_k=A·sin(phase+kπ)` dengan `A=9·(0.75+0.4·st)`; angkat ayun `ly_k=L·max(0,cos(phase+kπ))`, `L=3.2·(0.5+0.7·st)` — puncak angkat tepat saat kaki menyilang di bawah tubuh, nol pada setengah siklus tumpu → kaki tumpu menapak, kaki ayun melengkung. `boot()` diperluas ke `boot(lx,ly)`.
2. **Follow-through**: hem gaun `sin(phase-0.6)·6·(0.75+0.4·st)`, rambut belakang `sin(phase-0.9)·.05` — kain & rambut tertinggal 35–50° dari langkah. Cabang idle tak berubah.
3. **Jalur PNG** (`drawCharSheet`): tambah counter-rock torso `rotate(sin(phase)·.03·st)` dan sway 2× dilag −0.4 rad → siklus terbaca sebagai perpindahan bobot, bukan elevator lurus.
4. **Pitch akselerasi**: `p.acc` = d(vx)/dt terperambat (`1-pow(.01,dt)`); lean total = `(vx/262)·.11 + clamp(acc/900,±1)·.03` (tanda dikoreksi untuk mirror seperti 001). Bidang baru direset di `startWalk`.

## Verification

- `node --check` OK; `qa/route.cjs golden walkqa` bersih.
- Strip 6 frame saat lari: tinggi kedua boot bervariasi; ~50% frame memiliki satu boot persis di tanah (tumpu) — tanpa float; gaun/rambut tampak mengekor arah gerak; tap-start mencondongkan badan sesaat ke depan.
- Cek 001 masih lolos: no moonwalk di clamp, squash ~140ms saat berbalik, irama naik saat Shift.

## Round 2 (umpan balik "masih floating")

Akar terasa "mengambang" = **selip kaki** (foot sliding) di jalur PNG, bukan pose:
irama frame lama `|vx|·0.062` membuat dunia bergulir 2–5× lebih cepat dari yang disiratkan langkah gambar (~20px layar per langkah). Perbaikan kode:

1. **Irama dikunci longgar ke tanah** — `phase += |vx|·dt·0.105` (1 siklus ≈ 60px); tetap 0 saat mentok dinding (no moonwalk) dan naik saat Shift.
2. **Cross-fade antar frame** di `drawCharSheet`: 30% akhir tiap substep melebur frame berikutnya (anti pop saat 4 frame berganti cepat).

Catatan juri: kalau masih kurang natural, sumber terakhir adalah seni frame F1/F3 (pose ujung kaki/tip-toe) — regenerasi sel 1 & 3 lewat `scripts/gen_exprs.py`→`build_sheets.py` dengan prompt pose kaki belakang rata tanah (passing pose), QC lewat skrip yang ada. Gaya alternatif teruji: lihat *Universal LPC Spritesheet Character Generator* (8 frame + contact tegas) sebagai referensi pose, bukan gaya visual.
