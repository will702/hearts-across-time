# 008 — Skill-Audit Pass: Story × Gameplay × Aset

| Severity | Status |
|---|---|
| MEDIUM | DONE |

Konteks: audit enam lensa skill terpasang ([`design-game`], [`improve-animations`], [`performance-optimization`],
[`camera-systems`], [`level-design`], [`audio-design`]) lalu implementasi butir teratas. Toolchain: **agy** mengendarai
generasi gambar, **GLM (pi/zai glm-5.2)** me-review diff dua kali (pra & pasca), **pi zai-vision MCP** second-opinion
screenshot.

## Hasil audit → keputusan

- **PERF**: `grade()` diukur headless = **0.04 ms/frame** (worst full frame 0.5 ms @ walk 1944) → BUKAN bottleneck.
  Optimasi *dibatalkan* sesuai disiplin "measure first". Paper pattern & grain memang sudah di-cache.
- **anim**: eaze/spring/pause ok; 3 missed-opportunities dipungut (bob `▼ ENTER`, pose crossfade, marker pulse).
- **cam**: exp-smoothing sudah ada → ditambah look-ahead 22% vx (clamp ±75).
- **level**: segmen jalan dibedakan (1944: 1800/arX 1480 · 1968: 1500/1180 · 1999: 1300/1000).
- **audio**: slider volume → kurva persepsi `vGain=v^2.2` di 6 titik gain (master/sfx/mus/amb×2/toggle).

## Perubahan

**Story**
- Gema loop: `n_b2` déjà-vu kini 3 tingkat (was just `>=2`); `n_b3` gema baru loop 1 & ≥2 — didahulukan
  (bug ditemukan: cabang `ops=[...]` menimpa push; diperbaiki `pre.concat(ops)`).
- Layar glitch = **berkas kasus**: `⟨ BERKAS KASUS A1/B1/B2lock... ⟩` + sebaran ♥ empati × ⚙ logika siklus.
- **Fix desain**: empati/logika/rute direset tiap loop (sebelumnya bocor → true ending bisa digrinding) +
  `SAVE.game=null` di `startGlitch` (Continue `L` tak bisa men-undo reset — temuan GLM kedua).

**Gameplay**
- **Titik selidik (lore hotspots)**: `HOTSPOTS`+`LORE` (2×1944, 2×1968A/B, 1×1999); penanda ✦ berdenyut,
  `↓`/`S`/ketuk → strip narator (`drawNarr`) 2 baris; `SAVE.inspected` permanen; hitbox tap disesuaikan
  visual (temuan GLM ke-3).

**Aset (agy → gemini, ≤ budget)**
- 2 pose baru: `pose_arthur_muda_vial` (`r1b`), `pose_elena_resolve` (`n_b1`, filter `expr:'angry'` — loop≥3);
  `POSES` kini mendukung filter `expr` + `side:'arthur'`; semua pose **fade-in 250ms** (`poseFade` per-id map).
- 2 prop strip baru: `prop_flare1944` (x 1330 — penanda titik lore suar), `prop_frost1999` (x 620).
- `assets/art/backgrounds/bg1944_mid.png`: strip tepi kiri keabu-abuan disamakan tone-nya ke interior + seam di-blend ulang.
- Skrip: `gen_extra.py poses` kini menerima subset id; prompt batch-3 ditambah ke `gen_props.py`/`gen_extra.py`.

## QA

- `qa/vh_shots.js` +blok `inspectCheck` (hotspot→lore→tutup→tersimpan; echo 1968 loop=3; echo 1999 loop=2)
  +shot `vh_11b_pose_vial`. Rute golden+fail+inspect: **NO CONSOLE/PAGE ERRORS**.
- pi zai-vision MCP: 2 shot kunci — pass.
- Review GLM pasca-diff: 3 bug dilipat (echo overwrite, SAVE.game, poseFade per-side); hitbox tap diperbaiki.
- Perf diukur ulang: tidak ada biaya baru yang berarti (radial hotspot ≤2/frame).
