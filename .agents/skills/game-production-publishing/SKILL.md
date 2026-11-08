---
name: game-production-publishing
description: Use this skill when preparing 2D web games for production publishing, itch.io deployment, cross-platform inputs, responsive layouts, and performance optimization.
---

# Web Game Production & Publishing Standards

Daftar periksa kualitas rilis game web 2D:

## 1. Input Hybrid (Desktop & Mobile)
- Setiap aksi keyboard (WASD / Panah / Space / Enter) harus memiliki alternatif klik mouse dan tombol sentuh on-screen.
- Tombol sentuh harus memiliki *hit-area* yang nyaman (minimal $44 \times 44\text{px}$).

## 2. Audio Context Unlock
- WebAudio Context memerlukan interaksi pengguna (pointerdown / keydown) sebelum dapat mengeluarkan audio.
- Tangani resume audio secara halus tanpa melempar unhandled promise rejection.

## 3. Scale & Viewport Responsiveness
- Gunakan konfigurasi `Phaser.Scale.FIT` dengan `autoCenter: Phaser.Scale.CENTER_BOTH`.
- Pertahankan aspek rasio dasar $16:9$ ($960 \times 540$).

## 4. State & Error Resilience
- Validasi data input dan fallback texture sebelum memanggil method Game Object.
- Simpan progres pemain secara berkala ke `SaveSystem` untuk mencegah kehilangan data jika tab browser ditutup atau di-refresh.
