import type { WorldDefinition } from './worldTypes';

export function era1968Title(routeB1: string): string {
  return routeB1 === 'B'
    ? 'BABAK 2 — LABORATORIUM MILITER, 1968'
    : 'BABAK 2 — BUNKER BAWAH TANAH, 1968';
}

export function era1968ArthurAsset(routeB1: string): 'arthur-buron' | 'arthur-dewasa' {
  return routeB1 === 'B' ? 'arthur-dewasa' : 'arthur-buron';
}

export const ERA_1968 = {
  id: '1968',
  width: 1200,
  height: 540,
  groundY: 444,
  spawn: { x: 90, y: 444 },
  defaultSurface: 'metal',
  surfaces: [
    {
      id: 'ground',
      type: 'ground',
      bounds: { x: 0, y: 444, width: 1200, height: 160 },
      material: 'metal',
    },
    {
      id: 'left-bound',
      type: 'obstacle',
      bounds: { x: -52, y: 0, width: 104, height: 444 },
      material: 'metal',
    },
    {
      id: 'right-bound',
      type: 'obstacle',
      bounds: { x: 1172, y: 0, width: 104, height: 444 },
      material: 'metal',
    },
  ],
  objects: [
    {
      id: 'rose',
      type: 'puzzle',
      position: { x: 285, y: 444 },
      visual: { asset: 'rose-bottle-broken', displayHeight: 64, origin: { x: 0.5, y: 1 } },
      depth: 444,
      collider: { x: 260, y: 384, width: 50, height: 60 },
      sensor: {
        radius: 75,
        bounds: { x: 220, y: 394, width: 110, height: 100 },
      },
      action: { type: 'puzzle', id: 'rose' },
      prompt: { keyboard: 'SPACE — SUSUN BOTOL MAWAR', touch: 'SPACE — BOTOL MAWAR' },
      priority: 100,
      enabled: () => true,
      completed: state => Boolean(state.roseRepaired),
      surface: 'metal',
      saveKey: 'run.roseRepaired',
      resumeX: 343,
    },
    {
      id: 'signal',
      type: 'challenge',
      position: { x: 500, y: 444 },
      visual: { asset: 'prop-radio1968A', displayHeight: 74, origin: { x: 0.5, y: 1 } },
      depth: 443,
      collider: { x: 470, y: 370, width: 60, height: 74 },
      sensor: {
        radius: 80,
        bounds: { x: 430, y: 394, width: 120, height: 100 },
      },
      action: { type: 'challenge', era: '1968' },
      prompt: { keyboard: '▼ DEKRIPSI TRANSMISI', touch: '▼ DEKRIPSI TRANSMISI' },
      priority: 90,
      enabled: () => true,
      completed: state => Boolean(state.challenges['1968']),
      surface: 'metal',
      saveKey: 'run.challenges.1968',
      resumeX: 565,
    },
    {
      id: 'diary',
      type: 'lore',
      position: { x: 720, y: 444 },
      visual: { asset: 'diary-prop', fallbackAsset: 'lore-fallback', displayHeight: 68, origin: { x: 0.5, y: 1 } },
      depth: 442,
      sensor: {
        radius: 55,
        bounds: { x: 670, y: 394, width: 100, height: 100 },
      },
      action: { type: 'lore', id: 'diary' },
      prompt: { keyboard: 'SPACE — BACA BUKU HARIAN', touch: 'SPACE — BACA BUKU HARIAN' },
      priority: 80,
      enabled: () => true,
      completed: () => false,
      surface: 'metal',
      saveKey: 'save.inspected.diary',
    },
    {
      id: 'lore_tape',
      type: 'lore',
      position: { x: 805, y: 444 },
      visual: { asset: 'tape-prop', fallbackAsset: 'lore-fallback', displayHeight: 54, origin: { x: 0.5, y: 1 } },
      depth: 441,
      sensor: {
        radius: 48,
        bounds: { x: 775, y: 394, width: 60, height: 100 },
      },
      action: { type: 'lore', id: 'lore_tape' },
      prompt: { keyboard: 'SPACE — PERIKSA PITA АРТУР-1', touch: '▼ PERIKSA PITA АРТУР-1' },
      priority: 60,
      enabled: () => true,
      completed: state => Boolean(state.inspected.lore_tape),
      surface: 'metal',
      saveKey: 'save.inspected.lore_tape',
    },
    {
      id: 'arthur',
      type: 'exit',
      position: { x: 1000, y: 444 },
      visual: {
        asset: 'arthur-dewasa',
        fallbackAsset: 'arthur-fallback',
        frame: 0,
        displayHeight: 112,
        origin: { x: 0.5, y: 1 },
        flipX: true,
      },
      depth: 444,
      sensor: {
        radius: 160,
        bounds: { x: 860, y: 394, width: 320, height: 100 },
      },
      action: { type: 'dialog', node: 'n_b2' },
      priority: 10,
      auto: true,
      enabled: state => Boolean(state.roseRepaired) && Boolean(state.challenges['1968']),
      completed: () => false,
      surface: 'metal',
      saveKey: 'save.seen.n_b2',
    },
  ],
} satisfies WorldDefinition;
