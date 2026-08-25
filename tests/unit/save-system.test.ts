import { describe, expect, it } from 'vitest';

import {
  ENDING_KEYS,
  SAVE_VERSION,
  SaveSystem,
  allEndingsUnlocked,
  defaultRun,
  normalizeRun,
  normalizeSave,
  type StorageLike,
} from '../../src/game/systems/SaveSystem';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('normalizeSave', () => {
  it('normalizes the current save shape and preserves safe top-level progress', () => {
    const save = normalizeSave({
      saveVersion: SAVE_VERSION,
      seen: { prologue: 1, ignored: 0 },
      chosen: { 'pilihan hangat': true },
      endings: { A1: 1, true: true, unknown: 1 },
      inspected: { lore_crate: 1 },
      introDone: true,
      tutorial: { move: 1 },
      bonusSeen: true,
      bonusProgress: { nodes: [1, 2, null] },
      game: {
        era: '1968',
        S: {
          empathy: 3,
          logic: 1,
          routeB1: 'A',
          routeB2: '',
          loop: 2,
          challenges: { '1944': 'empathy', '1968': null, '1999': 'logic' },
          inventory: { watch: 1, date_menu: true },
          watchTargets: [0.2, 0.4, 0.8],
          watchRepaired: true,
          diaryRead: true,
        },
      },
    });

    expect(save.saveVersion).toBe(2);
    expect(save.seen).toEqual({ prologue: 1 });
    expect(save.chosen).toEqual({ 'pilihan hangat': 1 });
    expect(save.endings).toEqual({ A1: 1, true: 1 });
    expect(save.bonusSeen).toBe(true);
    expect(save.bonusProgress).toEqual({ nodes: [1, 2, null] });
    expect(save.game).toEqual({
      era: '1968',
      S: {
        empathy: 3,
        logic: 1,
        routeB1: 'A',
        routeB2: '',
        loop: 2,
        challenges: { '1944': 'empathy', '1968': null, '1999': 'logic' },
        inventory: { watch: 1, date_menu: 1 },
        watchTargets: [0.2, 0.4, 0.8],
        watchRepaired: true,
        roseRepaired: false,
        gemAligned: false,
        photoRepaired: false,
        diaryRead: true,
      },
    });
  });

  it('migrates a no-version 1944 save without bypassing the required watch repair', () => {
    const save = normalizeSave({
      introDone: true,
      seen: {},
      chosen: {},
      endings: {},
      inspected: {},
      tutorial: {},
      game: { era: '1944', S: { inventory: { watch: 1 }, challenges: {} } },
    });

    expect(save.saveVersion).toBe(SAVE_VERSION);
    expect(save.game?.era).toBe('1944');
    expect(save.game?.S.watchRepaired).toBe(false);
    expect(save.game?.S.inventory.watch).toBeUndefined();
    expect(save.game?.S.challenges).toEqual({ '1944': null, '1968': null, '1999': null });
  });

  it('keeps legacy inventory-only completion after its required era has passed', () => {
    const run = normalizeRun(
      {
        inventory: { watch: 1, flower: 1, water_gem: 1, arthur_photo: 1 },
      },
      '1968',
    );

    expect(run.watchRepaired).toBe(true);
    expect(run.inventory.watch).toBe(1);
    expect(run.roseRepaired).toBe(false);
    expect(run.inventory.flower).toBeUndefined();
    expect(run.gemAligned).toBe(true);
    expect(run.photoRepaired).toBe(true);
  });

  it('defaults malformed values, coerces an invalid era to 1944, and drops unsafe data', () => {
    const malformed = JSON.parse(`{
      "saveVersion":"future",
      "seen":[],
      "endings":{"A1":1,"not-an-ending":1},
      "game":{"era":"2088","S":{
        "empathy":"many","logic":-4,"loop":1.5,
        "routeB1":"X","routeB2":[],
        "challenges":{"1944":"win"},
        "inventory":{"watch":"yes","safe":1,"__proto__":1},
        "watchTargets":[0.2,"bad",0.8],
        "watchRepaired":"yes"
      }},
      "safeExtra":{"enabled":true},
      "unsafeExtra":{"constructor":{"polluted":true}}
    }`);

    const save = normalizeSave(malformed);

    expect(save.game).toEqual({ era: '1944', S: { ...defaultRun(), inventory: { safe: 1 } } });
    expect(save.endings).toEqual({ A1: 1 });
    expect(save.safeExtra).toEqual({ enabled: true });
    expect(save.unsafeExtra).toEqual({});
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('normalizes diary completion as a strict per-run flag', () => {
    expect(defaultRun().diaryRead).toBe(false);
    expect(normalizeRun({ diaryRead: true }).diaryRead).toBe(true);
    expect(normalizeRun({ diaryRead: 'yes' }).diaryRead).toBe(false);
  });

  it('unlocks the bonus only after all six known endings are awarded', () => {
    expect(allEndingsUnlocked({ true: 1 })).toBe(false);
    expect(allEndingsUnlocked(Object.fromEntries(ENDING_KEYS.map(key => [key, 1])))).toBe(true);
  });
});

describe('SaveSystem', () => {
  it('loads and persists a normalized version-2 migration in hat_save', () => {
    const storage = new MemoryStorage();
    storage.setItem('hat_save', JSON.stringify({ game: { era: 'bad-era', S: {} }, bonusSeen: true }));

    const system = new SaveSystem(storage);
    const loaded = system.load();
    const persisted = JSON.parse(storage.getItem('hat_save') ?? 'null');

    expect(loaded.saveVersion).toBe(SAVE_VERSION);
    expect(loaded.game?.era).toBe('1944');
    expect(persisted).toEqual(loaded);
  });

  it('recovers malformed JSON as a valid empty save', () => {
    const storage = new MemoryStorage();
    storage.setItem('hat_save', '{broken');

    const loaded = new SaveSystem(storage).load();

    expect(loaded.saveVersion).toBe(SAVE_VERSION);
    expect(loaded.game).toBeNull();
    expect(JSON.parse(storage.getItem('hat_save') ?? 'null')).toEqual(loaded);
  });

  it('keeps a current cache and exposes the native cycle facade', () => {
    const storage = new MemoryStorage();
    const system = new SaveSystem(storage);
    const run = system.beginCycle();

    expect(system.data.game).toBeNull();
    expect(run).toEqual(defaultRun());

    system.markIntroDone();
    system.saveCycle('1944', { ...run, watchRepaired: true }, 478);
    expect(system.data.introDone).toBe(true);
    expect(system.data.game).toEqual({
      era: '1944',
      playerX: 478,
      S: { ...defaultRun(), watchRepaired: true },
    });

    system.saveCycle('1944', { ...run, logic: 1 });
    expect(system.data.game?.playerX).toBe(478);

    system.saveCycle('1968', run);
    expect(system.data.game).not.toHaveProperty('playerX');

    system.clearCycle();
    expect(system.data.game).toBeNull();
    expect(JSON.parse(storage.getItem('hat_save') ?? 'null').game).toBeNull();
  });
});
