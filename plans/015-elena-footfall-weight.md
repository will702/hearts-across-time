# 015 — Give Elena's footfalls visible weight

- **Status**: DONE — implementasi selesai; QA visual/gameplay menunggu developer
- **Commit**: b60848a
- **Severity**: HIGH
- **Category**: Physicality & origin
- **Estimated scope**: 2 files, sekitar 8 baris berubah

## Problem

Animasi jalan Elena sudah memakai fase berbasis jarak, cross-fade frame, bob, lean, dan follow-through. Namun ketika fase mencapai pijakan kaki (`phase = kπ`), tubuh hanya kembali ke posisi dasar tanpa kompresi singkat. Akibatnya siklus masih terbaca ringan/melayang walau telapak tidak lagi selip.

```js
// src/core/assets.js:173 — current
else if (moving) { const st = opt.stride === undefined ? 1 : opt.stride; c.rotate(Math.sin(phase) * .03 * st); c.translate(Math.sin(phase * 2 - .4) * (0.6 + 0.5 * st), -Math.abs(Math.sin(phase)) * (1.6 + 1.4 * st)); }
```

```js
// src/render/characters.js:38-43 — current
const st=opt.stride===undefined?1:opt.stride;
const bob=moving?Math.abs(Math.sin(phase))*(1.6+1.4*st):Math.sin(t*2)*0.9;
const sw=moving?Math.sin(phase)*(0.75+0.4*st):Math.sin(t*1.4)*.1;
const sway=moving?Math.sin(phase-.9)*.05:Math.sin(t*1.3)*.018;
c.save();c.translate(0,-bob);
if(moving&&opt.lean)c.rotate(opt.lean);
```

## Target

Tambahkan pulsa kompresi deterministik tepat pada setiap footfall, memakai fase yang sudah ada:

```js
const impact=OPTS.reduceMotion?0:Math.pow(Math.abs(Math.cos(phase)),8)*st;
c.scale(1+impact*.012,1-impact*.018);
```

- `impact` bernilai maksimum pada `phase = kπ`, sama dengan pemicu SFX langkah.
- Skala berporos pada `(0,0)`, yaitu jangkar tengah-bawah sprite, sehingga telapak tetap di lantai.
- Lebar bertambah maksimum 1,2% dan tinggi berkurang maksimum 1,8%; tidak boleh menghasilkan squash kartun besar.
- `reduceMotion` mempertahankan frame jalan yang dibutuhkan gameplay tetapi meniadakan squash dekoratif.
- Kurangi counter-rock spritesheet dari `.03` menjadi `.022` rad agar kompresi kaki lebih terbaca dan kepala tidak terlalu terombang-ambing.

## Repo conventions to follow

- Fase langkah dihitung dari jarak di `src/game/flow.js:478`: `p.phase+=Math.abs(p.vx)*dt*.105`.
- Footstep SFX memakai lintasan `kπ` di `src/game/flow.js:481`; rumus impact harus memakai fase yang sama, tanpa state/timer baru.
- Semua transform karakter dilakukan relatif terhadap jangkar tengah-bawah; pertahankan `drawImage(...,-dw/2,-dh,dw,dh)` di `src/core/assets.js`.
- Fallback prosedural wajib tetap bekerja ketika PNG tidak tersedia.

## Steps

1. Di `src/core/assets.js`, dalam cabang `else if (moving)` milik `drawCharSheet`, hitung `impact`, turunkan counter-rock `.03` menjadi `.022`, lalu panggil `c.scale(1+impact*.012,1-impact*.018)` setelah translate.
2. Di `src/render/characters.js`, dalam `drawElena`, hitung `impact` setelah `st`, lalu terapkan skala yang sama setelah `c.translate(0,-bob)` dan sebelum lean.
3. Jangan mengubah cadence, frame sequence `[1,2,3,2]`, cross-fade, fisika gerak, atau aset PNG.

## Boundaries

- Jangan mengubah `assets/elena_sheet.png` atau menjalankan pipeline generasi aset.
- Jangan menyentuh Arthur, dialog, kamera, input, kecepatan, partikel, maupun audio.
- Jangan menimpa perubahan working tree yang sudah ada pada pass 014.
- Jangan menambah dependency, helper global, atau state baru.
- Jika baris target berbeda dari commit stamp/working tree, berhenti dan laporkan drift.

## Verification

- **Mechanical**: developer menjalankan pemeriksaan sintaks untuk `src/core/assets.js` dan `src/render/characters.js` melalui harness game yang sudah ada.
- **Feel check**: developer menjalankan game, tahan gerak kanan pada kecepatan jalan dan sprint, lalu konfirmasi:
  - tubuh memadat singkat tepat saat setiap suara langkah berbunyi;
  - telapak tidak menembus atau terangkat dari lantai saat squash;
  - perubahan terasa sebagai bobot, bukan karakter memantul seperti karet;
  - arah kiri dan kanan identik setelah mirror;
  - dengan Reduce Motion aktif, squash hilang tetapi siklus jalan tetap berjalan.
- **Done when**: kelima observasi di atas lolos pada jalur PNG dan fallback prosedural; QA visual tetap dijalankan developer sesuai `AGENTS.md`.
