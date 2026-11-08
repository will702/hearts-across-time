import { describe, expect, it } from 'vitest';

import {
  distanceBetween,
  isInteractionEligible,
  selectInteraction,
} from '../../src/game/systems/InteractionSystem';
import { selectSurfaceMaterial } from '../../src/game/systems/SurfaceSystem';
import { ERA_1944 } from '../../src/game/world/era1944';
import { isWorldObjectActive } from '../../src/game/world/WorldObject';
import type { WorldObjectDefinition, WorldState } from '../../src/game/world/worldTypes';

const state = (changes: Partial<WorldState> = {}): WorldState => ({
  watchRepaired: false,
  challenges: { '1944': null, '1968': null, '1999': null },
  inspected: {},
  ...changes,
});

function object(id: string): WorldObjectDefinition {
  const definition = ERA_1944.objects.find(candidate => candidate.id === id);
  if (!definition) throw new Error(`Definisi dunia tidak ditemukan: ${id}`);
  return definition;
}

describe('interaksi dunia 1944', () => {
  it('menghitung jarak dan mempertahankan batas sensor lama', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(isInteractionEligible(object('watch'), state(), { x: 440, y: 444 })).toBe(true);
    expect(isInteractionEligible(object('watch'), state(), { x: 441, y: 444 })).toBe(false);

    const radiusOnly = {
      ...object('lore_crate'),
      sensor: { radius: 40, center: { x: 480, y: 430 } },
    };
    expect(isInteractionEligible(radiusOnly, state(), { x: 504, y: 462 })).toBe(true);
    expect(isInteractionEligible(radiusOnly, state(), { x: 505, y: 462 })).toBe(false);
  });

  it('memilih prioritas tertinggi ketika sensor bertumpuk', () => {
    expect(selectInteraction(ERA_1944.objects, state(), { x: 440, y: 444 })?.id).toBe('watch');
  });

  it('menonaktifkan benda selesai dan membuka Arthur setelah prasyarat', () => {
    const complete = state({
      watchRepaired: true,
      challenges: { '1944': 'empathy', '1968': null, '1999': null },
    });
    expect(isWorldObjectActive(object('watch'), complete)).toBe(false);
    expect(isWorldObjectActive(object('lore_crate'), state({ inspected: { lore_crate: 1 } }))).toBe(false);
    expect(isWorldObjectActive(object('arthur'), state())).toBe(false);
    expect(isWorldObjectActive(object('arthur'), complete)).toBe(true);
    expect(selectInteraction(ERA_1944.objects, complete, { x: 1240, y: 444 })?.action)
      .toEqual({ type: 'dialog', node: 'n_b1' });
  });
});

describe('permukaan dunia 1944', () => {
  it('memilih material di bawah kaki dan fallback di luar dunia', () => {
    expect(selectSurfaceMaterial(ERA_1944.surfaces, { x: 90, y: 444 })).toBe('mud');
    expect(selectSurfaceMaterial(ERA_1944.surfaces, { x: -20, y: 200 })).toBe('wood');
    expect(selectSurfaceMaterial(ERA_1944.surfaces, { x: 1600, y: 444 })).toBe('unknown');
  });
});
