import { describe, expect, it } from 'vitest';

import { buildRunRecap, deriveEndingProgress } from '../../src/game/minigames/endingProgress';
import { defaultRun, type EndingKey } from '../../src/game/systems/SaveSystem';

describe('deriveEndingProgress', () => {
  it('membedakan keping baru dari keping yang telah dimiliki tanpa menggandakan total', () => {
    const endings: Partial<Record<EndingKey, 1>> = { A1: 1, B1: 1 };

    expect(deriveEndingProgress(endings, 'B2lock')).toMatchObject({ fresh: true, total: 3, complete: false });
    expect(deriveEndingProgress(endings, 'A1')).toMatchObject({ fresh: false, total: 2, complete: false });
  });

  it('menandai kota lengkap tepat setelah keping keenam diperoleh', () => {
    const five: Partial<Record<EndingKey, 1>> = {
      A1: 1,
      B1: 1,
      B2lock: 1,
      rebut: 1,
      paradox: 1,
    };
    const progress = deriveEndingProgress(five, 'true');

    expect(progress).toMatchObject({ fresh: true, total: 6, complete: true });
    expect(Object.values(progress.unlocked).every(Boolean)).toBe(true);
  });
});

describe('buildRunRecap', () => {
  it('merangkum afinitas, rute, tantangan, loop, dan hanya lima lore kanonis', () => {
    const run = {
      ...defaultRun(),
      loop: 3,
      empathy: 4,
      logic: 2,
      routeB1: 'A' as const,
      routeB2: 'B2' as const,
      challenges: { '1944': 'empathy', '1968': 'logic', '1999': 'empathy' } as const,
    };
    const recap = buildRunRecap(run, {
      lore_crate: 1,
      lore_flare: 1,
      lore_photo: 1,
      lore_tape: 1,
      lore_clip: 1,
      bukan_lore: 1,
    });

    expect(recap).toMatchObject({
      loop: 3,
      empathy: 4,
      logic: 2,
      routes: ['RUTE 1A', 'RUTE 2B2'],
      loreFound: 5,
      loreTotal: 5,
      loreComplete: true,
    });
    expect(recap.challenges.map(entry => entry.result)).toEqual(['empathy', 'logic', 'empathy']);
  });
});
