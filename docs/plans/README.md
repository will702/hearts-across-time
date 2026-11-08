# Animation Plans — Hearts Across Time

> **ARSIP HISTORIS:** Dokumen 001–015 merekam keputusan dan pass pada saat dibuat. Status
> `DONE` bukan bukti bahwa detailnya masih cocok dengan checkout sekarang. Untuk arsitektur,
> nilai, path, dan perilaku aktif, selalu ikuti `index.html`, `src/`, `AGENTS.md`, dan `docs/`.

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 001 | Weighty walking: acceleration, speed-driven stride, turn squash | HIGH | DONE |
| 002 | Bugfix pass: speaker bounce, era particles, tap icons, fade-in, typewriter, pause audio | HIGH | DONE |
| 003 | Natural walking: elliptical step arcs, cloth follow-through, accel pitch | HIGH | DONE |
| 004 | Replay QoL: loop pacing, backlog, endings tracker, loop dialogue, mixer, accessibility, touch parity | MEDIUM | DONE |
| 005 | Valiant Hearts look: paper+ink UI kit, comic captions, foreground silhouettes, haze, print grading, hand font | MEDIUM | DONE |
| 006 | Asset-rich & alive: 9 animated props, painted fg layers, 3 key poses, rain, CC0 audio (steps/ambience/rustle), idle breathing | MEDIUM | DONE |
| 007 | Repair 1999: bg1999_mid layer (no-capsule mid strip), rebuild bg1999_far (smear/fringe), 1968 step filter, flip throttle, endcard fg; tooling agy+pi-vision+GLM+DashScope WanX | MEDIUM | DONE |
| 008 | Skill-audit pass: loop echoes 1968/1999 + glitch case-files + affinity-per-loop reset, 5 lore hotspots, walk pacing per era, camera look-ahead, vGain curves, 2 poses + 2 props, 1944 mid tone seam | MEDIUM | DONE |
| 009 | Asset finalize: audit pakai semua aset gen, fix bocor pink flare/frost + serpih pose reach, flare ke parapet, QA cakupan penuh (15 tembakan) | MEDIUM | DONE |
| 010 | Seam BG/FG & penempatan: bug rumus seam_blend ditutup (junction 0==w-1), 10 bg + 1968A_fg final difix (seamdiff→0), bohlam 1968A naik agar kordel nyambung langit2 | MEDIUM | DONE |
| 011 | Onboarding, cover interaktif, peta waktu, dan tiga mini-game afinitas wajib | HIGH | DONE |
| 014 | Compact tableaux & foreground clearance: perjalanan lebih rapat, FG lukis diturunkan | MEDIUM | DONE |
| 015 | Elena footfall weight: kompresi halus saat pijakan, counter-rock lebih tenang | HIGH | DONE — QA developer pending |

Recommended order: 001 first (player locomotion is on screen ~60% of runtime), then 002 → 003 → 004. All landed.
