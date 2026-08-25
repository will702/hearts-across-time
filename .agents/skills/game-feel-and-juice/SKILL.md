---
name: game-feel-and-juice
description: Use this skill when adding polish, screenshake, particle bursts, audio-visual feedback, micro-interactions, sweet-spot glows, and juice to 2D web games.
---

# Game Feel & Juice in 2D Web Games

Panduan memberikan umpan balik audiovisual yang responsif, memuaskan, dan mudah diakses:

## 1. Sweet-Spot Glow & Proximity Feedback
Beri pemain indikator visual yang intensitasnya meningkat seiring mendekati target:
```typescript
// Intensitas glow berdasarkan jarak dari target [0, 1]
const proximity = Math.max(0, 1 - distance / tolerance);
indicator.setAlpha(0.3 + proximity * 0.7);
indicator.setScale(1 + proximity * 0.15);
```

## 2. Dynamic Audio Feedback Layering
Gunakan frekuensi dinamis atau layering suara sintetis untuk merespon interaksi pemain:
- **Tick**: Cepat (15-30ms) dengan pitch bervariasi sesuai putaran roda gigi / dial.
- **Lock**: Akord harmonis ganda (dua nada berjarak interval 3rd atau 5th).
- **Miss**: Nada gergaji rendah atau suara getar (sawtooth/noise).

## 3. Accessible Camera Shake
Selalu periksa opsi `reduceMotion` sebelum memicu efek guncangan kamera:
```typescript
if (!this.registry.get('reduceMotion')) {
  this.cameras.main.shake(durationMs, intensity);
}
```

## 4. Celebratory Micro-Particles
Tambahkan burst partikel kecil saat mencapai checkpoint / keberhasilan:
```typescript
for (let i = 0; i < count; i++) {
  const p = scene.add.circle(x, y, Phaser.Math.Between(2, 4), color);
  const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
  const speed = Phaser.Math.Between(50, 180);
  scene.tweens.add({
    targets: p,
    x: x + Math.cos(angle) * speed,
    y: y + Math.sin(angle) * speed,
    alpha: 0,
    scale: 0.2,
    duration: 500,
    ease: 'Cubic.easeOut',
    onComplete: () => p.destroy(),
  });
}
```
