import { describe, expect, it } from 'vitest';

import {
  randomRoseHomes,
  ROSE_PIECES_DEF,
  rosePieceScreenBounds,
  roseRectsOverlap,
} from '../../src/game/minigames/roseLayout';

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
        const inLeftZone = box.left >= 90 && box.right <= 330;
        const inRightZone = box.left >= 630 && box.right <= 870;
        expect(inLeftZone || inRightZone).toBe(true);
        expect(box.top).toBeGreaterThanOrEqual(125);
        expect(box.bottom).toBeLessThanOrEqual(370);
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
});
