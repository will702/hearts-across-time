import { describe, expect, it } from 'vitest';

import {
  randomRoseHomes,
  ROSE_LAYOUT_VARIANT_COUNT,
  ROSE_PIECES_DEF,
  ROSE_TARGET,
  rosePiecesForLoop,
  rosePieceScreenBounds,
  roseRectsOverlap,
} from '../../src/game/minigames/roseLayout';

function polygonArea(poly: [number, number][]): number {
  return Math.abs(poly.reduce((area, [x, y], index) => {
    const [nextX, nextY] = poly[(index + 1) % poly.length];
    return area + x * nextY - nextX * y;
  }, 0)) / 2;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x1_0000_0000;
  };
}

describe('randomRoseHomes', () => {
  it('menempatkan delapan pecahan di sisi target tanpa saling bertumpuk', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const homes = randomRoseHomes(seededRandom(seed));
      const bounds = homes.map((home, index) => rosePieceScreenBounds(ROSE_PIECES_DEF[index].poly, home));

      expect(homes).toHaveLength(ROSE_PIECES_DEF.length);
      bounds.forEach((box) => {
        const inLeftZone = box.left >= 70 && box.right <= 340;
        const inRightZone = box.left >= 620 && box.right <= 890;
        expect(inLeftZone || inRightZone).toBe(true);
        expect(box.top).toBeGreaterThanOrEqual(115);
        expect(box.bottom).toBeLessThanOrEqual(385);
      });
      for (let i = 0; i < bounds.length; i++) {
        for (let j = i + 1; j < bounds.length; j++) {
          expect(roseRectsOverlap(bounds[i], bounds[j], 6.9)).toBe(false);
        }
      }
    }
  });

  it('menghasilkan komposisi rumah yang berbeda antarsiklus', () => {
    const layouts = new Set(
      [11, 22, 33, 44].map(seed => JSON.stringify(randomRoseHomes(seededRandom(seed)))),
    );
    expect(layouts.size).toBeGreaterThan(1);
  });

  it('mengubah bentuk pecahan pada setiap loop tanpa celah di target', () => {
    const signatures = new Set<string>();

    for (let loop = 0; loop < ROSE_LAYOUT_VARIANT_COUNT; loop++) {
      const pieces = rosePiecesForLoop(loop);
      const signature = JSON.stringify(pieces);
      signatures.add(signature);

      expect(pieces).toHaveLength(8);
      expect(pieces.reduce((sum, piece) => sum + polygonArea(piece.poly), 0))
        .toBe(ROSE_TARGET.w * ROSE_TARGET.h);
      pieces.forEach(({ poly }) => {
        expect(polygonArea(poly)).toBeGreaterThan(1);
        poly.forEach(([x, y]) => {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(ROSE_TARGET.w);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(ROSE_TARGET.h);
        });
      });
    }

    expect(signatures.size).toBe(ROSE_LAYOUT_VARIANT_COUNT);
    expect(rosePiecesForLoop(ROSE_LAYOUT_VARIANT_COUNT)).toEqual(rosePiecesForLoop(0));
  });

  it('tetap menempatkan variasi pecahan loop di luar papan tanpa bertumpuk', () => {
    for (let loop = 0; loop < ROSE_LAYOUT_VARIANT_COUNT; loop++) {
      const pieces = rosePiecesForLoop(loop);
      const homes = randomRoseHomes(seededRandom(loop + 101), pieces);
      const bounds = homes.map((home, index) => rosePieceScreenBounds(pieces[index].poly, home));

      bounds.forEach((box) => {
        const inLeftZone = box.left >= 70 && box.right <= 340;
        const inRightZone = box.left >= 620 && box.right <= 890;
        expect(inLeftZone || inRightZone).toBe(true);
        expect(box.top).toBeGreaterThanOrEqual(115);
        expect(box.bottom).toBeLessThanOrEqual(385);
      });
      for (let i = 0; i < bounds.length; i++) {
        for (let j = i + 1; j < bounds.length; j++) {
          expect(roseRectsOverlap(bounds[i], bounds[j], 6.9)).toBe(false);
        }
      }
    }
  });
});
