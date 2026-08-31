import { describe, expect, it } from 'vitest';
import {
  cameraDisplaySize,
  containCameraTransform,
  smoothCameraTransform,
  trackFaceTransform,
} from '../../src/game/minigames/photoBoothCamera';

describe('photo booth camera framing', () => {
  it('mempertahankan rasio video saat diperkecil', () => {
    const source = { width: 1280, height: 720 };
    const transform = containCameraTransform(
      { x: 610, y: 168, width: 300, height: 169 },
      source,
    );
    const display = cameraDisplaySize(source, transform);

    expect(display.width / display.height).toBeCloseTo(16 / 9, 8);
    expect(display.width).toBeLessThanOrEqual(300);
    expect(display.height).toBeLessThanOrEqual(169);
  });

  it('memetakan pusat wajah yang sudah dicerminkan ke pusat bingkai', () => {
    const source = { width: 1280, height: 720 };
    const face = { x: 220, y: 140, width: 240, height: 300 };
    const slot = { x: 610, y: 164, width: 104, height: 132 };
    const transform = trackFaceTransform(source, face, slot, 0.8);
    const mirroredFaceX = source.width - (face.x + face.width / 2);
    const mappedX = transform.x + (mirroredFaceX - source.width / 2) * transform.scale;
    const mappedY = transform.y + (face.y + face.height / 2 - source.height / 2) * transform.scale;

    expect(mappedX).toBeCloseTo(slot.x, 8);
    expect(mappedY).toBeCloseTo(slot.y, 8);
    expect(face.width * transform.scale).toBeLessThanOrEqual(slot.width * 0.8 + 0.001);
    expect(face.height * transform.scale).toBeLessThanOrEqual(slot.height * 0.8 + 0.001);
  });

  it('menghaluskan tracking secara konsisten terhadap waktu frame', () => {
    const current = { x: 0, y: 0, scale: 0.1 };
    const target = { x: 100, y: 50, scale: 0.4 };
    const oneFrame = smoothCameraTransform(current, target, 16, 8);
    const twoHalfFrames = smoothCameraTransform(
      smoothCameraTransform(current, target, 8, 8),
      target,
      8,
      8,
    );

    expect(twoHalfFrames.x).toBeCloseTo(oneFrame.x, 8);
    expect(twoHalfFrames.y).toBeCloseTo(oneFrame.y, 8);
    expect(twoHalfFrames.scale).toBeCloseTo(oneFrame.scale, 8);
  });
});
