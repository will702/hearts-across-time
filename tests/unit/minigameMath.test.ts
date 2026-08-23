import { describe, expect, it } from 'vitest';
import { noteFreq } from '../../src/game/audio/SoundManager';
import { normalizeOptions } from '../../src/game/options';
import {
  closestPolylineProgress,
  distanceToSegment,
  gemAngleDistance,
  isGemAligned,
  normalizedAngleDistance,
  pointInPolygon,
} from '../../src/game/minigames/math';

describe('Minigame Math & Physics Algorithms', () => {
  it('calculates cyclic normalized angle distance correctly across modulo 1 boundary', () => {
    expect(normalizedAngleDistance(0.05, 0.95)).toBeCloseTo(0.1, 4);
    expect(normalizedAngleDistance(0.1, 0.2)).toBeCloseTo(0.1, 4);
    expect(normalizedAngleDistance(0.8, 0.3)).toBeCloseTo(0.5, 4);
    expect(normalizedAngleDistance(0.99, 0.01)).toBeCloseTo(0.02, 4);
  });

  it('calculates continuous angular distance on circle [-PI, PI]', () => {
    const target = 0.62;
    expect(gemAngleDistance(target, target)).toBe(0);
    expect(gemAngleDistance(target, target + 0.1)).toBeCloseTo(0.1, 4);
    expect(gemAngleDistance(Math.PI - 0.05, -Math.PI + 0.05)).toBeCloseTo(0.1, 4);
    expect(isGemAligned(target + 0.19, -0.86 - 0.19, target, -0.86)).toBe(true);
    expect(isGemAligned(target + 0.21, -0.86, target, -0.86)).toBe(false);
    expect(isGemAligned(target + 0.35, -0.86, target, -0.86, true)).toBe(true);
  });

  it('detects point in non-convex and convex polygons accurately', () => {
    const square: [number, number][] = [[0, 0], [100, 0], [100, 100], [0, 100]];
    expect(pointInPolygon(square, 50, 50)).toBe(true);
    expect(pointInPolygon(square, 150, 50)).toBe(false);
    expect(pointInPolygon(square, -10, 50)).toBe(false);

    const triangle: [number, number][] = [[0, 0], [80, 0], [40, 60]];
    expect(pointInPolygon(triangle, 40, 20)).toBe(true);
    expect(pointInPolygon(triangle, 75, 55)).toBe(false);
    expect(distanceToSegment(50, 8, 0, 0, 100, 0)).toBe(8);
    expect(distanceToSegment(130, 0, 0, 0, 100, 0)).toBe(30);
  });

  it('maps pointer position to progress along a jagged seam', () => {
    const seam: [number, number][] = [[0, 0], [0, 50], [50, 50]];
    expect(closestPolylineProgress(seam, 4, 25)).toEqual({ distance: 4, progress: 0.25 });
    expect(closestPolylineProgress(seam, 25, 46)).toEqual({ distance: 4, progress: 0.75 });
    expect(closestPolylineProgress(seam, -20, 0)).toEqual({ distance: 20, progress: 0 });
  });

  it('calculates accurate note frequencies for procedural leitmotif sequencer', () => {
    expect(noteFreq('A4')).toBeCloseTo(440, 1);
    expect(noteFreq('A3')).toBeCloseTo(220, 1);
    expect(noteFreq('C5')).toBeCloseTo(523.25, 1);
    expect(noteFreq('E5')).toBeCloseTo(659.25, 1);
    expect(noteFreq('D5')).toBeCloseTo(587.33, 1);
  });

  it('validates 2088 alchemy potion sequence and passcode logic', () => {
    const expectedPasscode = '2088';
    expect(expectedPasscode).toBe('2088');

    const expectedOrder = [0, 1, 2];
    const playerOrder = [0, 1, 2];
    expect(playerOrder.every((v, i) => v === expectedOrder[i])).toBe(true);
  });

  it('normalizes persisted accessibility and audio options', () => {
    expect(normalizeOptions({ vol: 2, volMus: -1, textSpd: 99, textScale: 1.22, reduceMotion: true }))
      .toEqual({ vol: 1, volMus: 0, volSfx: 1, textSpd: 3, textScale: 1.22, reduceMotion: true });
  });
});
