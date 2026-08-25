---
name: 2d-web-game-math
description: Use this skill when implementing mathematical formulas, geometry, trigonometry, angle wrapping, harmonic waves, 3D projections, and spring physics in 2D web games.
---

# 2D Web Game Mathematics & Physics Guide

Panduan formula matematika terapan untuk pengembangan game 2D & Phaser:

## 1. Modular Angle Wrapping & Normalization
Mencegah jitter pada rotasi lingkaran ketika melewati batas $0$ dan $2\pi$ atau $0$ dan $1$:
```typescript
// Jarak terpendek antara dua sudut dalam radian [-PI, PI]
export function shortestAngleDistance(current: number, target: number): number {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

// Jarak sudut siklik pada skala normalisasi [0, 1]
export function normalizedAngleDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 1;
  return Math.min(diff, 1 - diff);
}
```

## 2. Harmonic Oscillations & Waveform Synthesis
Simulasi osiloskop, denyut ECG, dan gelombang suara:
```typescript
// Multi-harmonic Fourier waveform
export function harmonicWave(t: number, f1 = 1, f2 = 2, noise = 0): number {
  return Math.sin(t * f1 * Math.PI * 2) * 0.7 
       + Math.sin(t * f2 * Math.PI * 2 + Math.PI / 4) * 0.3 
       + (Math.random() * 2 - 1) * noise;
}
```

## 3. 3D Isometric / Orthographic Rotation Projection
Membuat ilusi visual 3D pada kristal / permata 2D:
```typescript
export function project3DFacet(x: number, y: number, z: number, rx: number, ry: number): [number, number] {
  // Rotasi sumbu Y lalu sumbu X
  const x1 = x * Math.cos(ry) + z * Math.sin(ry);
  const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
  const y2 = y * Math.cos(rx) - z1 * Math.sin(rx);
  return [x1, y2];
}
```

## 4. Spring Physics & Magnetic Snap Easing
Snapping kepingan puzzle dengan gaya pegas halus:
```typescript
export function springInterpolate(current: number, target: number, velocity: number, stiffness = 0.15, damping = 0.8): { pos: number; vel: number } {
  const force = (target - current) * stiffness;
  const newVel = (velocity + force) * damping;
  return { pos: current + newVel, vel: newVel };
}
```

## 5. Point in Polygon Test (Ray Casting)
Deteksi klik kepingan puzzle tidak beraturan:
```typescript
export function pointInPolygon(poly: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
```
