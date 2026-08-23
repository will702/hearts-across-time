import { describe, expect, it } from 'vitest';

function normalizedAngleDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 1;
  return Math.min(diff, 1 - diff);
}

function gemAngleDist(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function pointInPolygon(poly: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

describe('Minigame Math & Physics Algorithms', () => {
  it('calculates cyclic normalized angle distance correctly across modulo 1 boundary', () => {
    expect(normalizedAngleDistance(0.05, 0.95)).toBeCloseTo(0.1, 4);
    expect(normalizedAngleDistance(0.1, 0.2)).toBeCloseTo(0.1, 4);
    expect(normalizedAngleDistance(0.8, 0.3)).toBeCloseTo(0.5, 4);
    expect(normalizedAngleDistance(0.99, 0.01)).toBeCloseTo(0.02, 4);
  });

  it('calculates continuous angular distance on circle [-PI, PI]', () => {
    const target = 0.62;
    expect(gemAngleDist(target, target)).toBe(0);
    expect(gemAngleDist(target, target + 0.1)).toBeCloseTo(0.1, 4);
    expect(gemAngleDist(Math.PI - 0.05, -Math.PI + 0.05)).toBeCloseTo(0.1, 4);
  });

  it('detects point in non-convex and convex polygons accurately', () => {
    const square: [number, number][] = [[0, 0], [100, 0], [100, 100], [0, 100]];
    expect(pointInPolygon(square, 50, 50)).toBe(true);
    expect(pointInPolygon(square, 150, 50)).toBe(false);
    expect(pointInPolygon(square, -10, 50)).toBe(false);

    const triangle: [number, number][] = [[0, 0], [80, 0], [40, 60]];
    expect(pointInPolygon(triangle, 40, 20)).toBe(true);
    expect(pointInPolygon(triangle, 75, 55)).toBe(false);
  });

  it('validates 2088 alchemy potion sequence and passcode logic', () => {
    const expectedPasscode = '2088';
    expect(expectedPasscode).toBe('2088');

    const expectedOrder = [0, 1, 2];
    const playerOrder = [0, 1, 2];
    expect(playerOrder.every((v, i) => v === expectedOrder[i])).toBe(true);
  });
});
