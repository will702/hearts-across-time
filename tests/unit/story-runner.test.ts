import { describe, expect, it } from 'vitest';

import { LegacyStateAdapter } from '../../src/game/legacy/LegacyStateAdapter';
import { LEGACY_ENTRY_PATH, LEGACY_SCENES } from '../../src/game/narrative/storyData';
import { StoryRunner, canTransition } from '../../src/game/narrative/StoryRunner';
import { SaveSystem, defaultRun, type StorageLike } from '../../src/game/systems/SaveSystem';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

describe('story transition guards', () => {
  it('allows the native title to enter the 1944 vertical slice', () => {
    expect(canTransition('title', '1944', defaultRun())).toBe(true);
  });

  it('blocks the legacy boundary until the watch is repaired', () => {
    expect(canTransition('1944', 'legacy', defaultRun())).toBe(false);
    expect(canTransition('1944', 'legacy', { ...defaultRun(), watchRepaired: true })).toBe(true);
  });

  it('rejects transitions outside the declared migration path', () => {
    expect(canTransition('title', 'legacy', defaultRun())).toBe(false);
    expect(canTransition('legacy', '1944', defaultRun())).toBe(false);
    expect(LEGACY_SCENES).toEqual(['1968', '1999']);
  });

  it('provides the same guard through the app-facing StoryRunner facade', () => {
    const runner = new StoryRunner();

    expect(runner.transition('title', '1944', defaultRun())).toBe(true);
    expect(runner.transition('1944', 'legacy', defaultRun())).toBe(false);
  });
});

describe('LegacyStateAdapter', () => {
  it('persists the handoff and navigates only to the executable legacy entry', () => {
    const storage = new MemoryStorage();
    const visited: string[] = [];
    const adapter = new LegacyStateAdapter(new SaveSystem(storage), path => visited.push(path));

    adapter.enter('1968', { ...defaultRun(), watchRepaired: true });

    expect(visited).toEqual([LEGACY_ENTRY_PATH]);
    expect(LEGACY_ENTRY_PATH).toBe('/legacy.html?continue=1');
    expect(JSON.parse(storage.getItem('hat_save') ?? 'null').game.era).toBe('1968');
  });

  it('rejects a native era at the legacy boundary', () => {
    const adapter = new LegacyStateAdapter(new SaveSystem(new MemoryStorage()), () => undefined);

    expect(() => adapter.enter('1944', defaultRun())).toThrow(/legacy/i);
  });
});
