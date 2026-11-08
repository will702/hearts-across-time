import { describe, expect, it } from 'vitest';

import {
  LORE_IDS,
  LORE_LINES,
  allLoreInspected,
  recordLoreInspection,
} from '../../src/game/narrative/lore';
import { STORY_NODES } from '../../src/game/narrative/storyScript';
import {
  shouldAutoAdvanceSeenDialogue,
  shouldPersistCycleOnShutdown,
  shouldRun,
} from '../../src/game/systems/replayRules';
import { archiveEchoTrails, beginEchoTrail, previousEchoTrail } from '../../src/game/systems/LoopEchoTrail';
import { defaultRun } from '../../src/game/systems/SaveSystem';
import { ERA_1968, era1968ArthurAsset, era1968Title } from '../../src/game/world/era1968';
import { ERA_1999 } from '../../src/game/world/era1999';

describe('paritas replay loop', () => {
  it('membalik fungsi tombol sprint setelah loop pertama', () => {
    expect(shouldRun(0, false)).toBe(false);
    expect(shouldRun(0, true)).toBe(true);
    expect(shouldRun(1, false)).toBe(true);
    expect(shouldRun(3, true)).toBe(false);
  });

  it('hanya memajukan otomatis dialog lama ketika fast-forward ditahan', () => {
    expect(shouldAutoAdvanceSeenDialogue(true, true)).toBe(true);
    expect(shouldAutoAdvanceSeenDialogue(false, true)).toBe(false);
    expect(shouldAutoAdvanceSeenDialogue(true, false)).toBe(false);
  });

  it('tidak menyimpan ulang siklus yang sudah mencapai ending', () => {
    expect(shouldPersistCycleOnShutdown(false)).toBe(true);
    expect(shouldPersistCycleOnShutdown(true)).toBe(false);
  });

  it('mengarsipkan jejak siklus hanya di memori sesi', () => {
    const run = defaultRun();
    beginEchoTrail(run, '1944').push(90, 120, 180);
    archiveEchoTrails(run);
    expect(previousEchoTrail(run, '1944')).toEqual([90, 120, 180]);
    expect(beginEchoTrail(run, '1944')).toEqual([]);
  });
});

describe('paritas rute 1968', () => {
  it('memilih identitas Arthur dan judul era sesuai rute', () => {
    expect(era1968ArthurAsset('A')).toBe('arthur-buron');
    expect(era1968ArthurAsset('B')).toBe('arthur-dewasa');
    expect(era1968Title('A')).toContain('BUNKER BAWAH TANAH');
    expect(era1968Title('B')).toContain('LABORATORIUM MILITER');
  });
});

describe('lima jejak kisah Arthur', () => {
  it('memasang hotspot lanjutan pada era yang tepat', () => {
    const ids1968 = ERA_1968.objects.map(object => object.id);
    const ids1999 = ERA_1999.objects.map(object => object.id);
    expect(ids1968).toContain('lore_tape');
    expect(ids1968).not.toContain('lore_photo');
    expect(ids1999).toEqual(expect.arrayContaining(['lore_clip', 'lore_photo']));
  });

  it('mempertahankan dua baris lore asli sebagai node dialog', () => {
    LORE_IDS.forEach((id) => {
      expect(STORY_NODES[id]).toEqual(LORE_LINES[id].map(text => ({ t: 'say', who: 'narrator', text })));
    });
  });

  it('memberi payoff tepat saat jejak kelima ditemukan', () => {
    const firstFour = Object.fromEntries(
      LORE_IDS.slice(0, 4).map(id => [id, 1] as const),
    ) as Record<string, 1>;
    expect(allLoreInspected(firstFour)).toBe(false);

    const result = recordLoreInspection(firstFour, LORE_IDS[4], false);
    expect(allLoreInspected(result.inspected)).toBe(true);
    expect(result.completedNow).toBe(true);
    expect(recordLoreInspection(result.inspected, LORE_IDS[4], true).completedNow).toBe(false);
  });
});
