import { describe, expect, it } from 'vitest';
import {
  getArthurDiary,
  getStoryOps,
  type NarrativeState,
  type StoryEndingOp,
} from '../../src/game/narrative/storyScript';

const baseState = (overrides: Partial<NarrativeState> = {}): NarrativeState => ({
  empathy: 0,
  logic: 0,
  routeB1: '',
  routeB2: '',
  loop: 0,
  ...overrides,
});

function endingFor(nodeId: string, state = baseState()): StoryEndingOp['kind'] | undefined {
  return getStoryOps(nodeId, state)?.find((op): op is StoryEndingOp => op.t === 'ending')?.kind;
}

describe('storyScript narrative engine', () => {
  it('returns all dialogue nodes correctly', () => {
    const prologue = getStoryOps('prologue');
    expect(prologue).toBeDefined();
    expect(prologue?.length).toBeGreaterThan(0);

    const b1 = getStoryOps('n_b1');
    expect(b1).toBeDefined();
    expect(b1?.length).toBeGreaterThan(0);

    const finalNode = getStoryOps('final_reagent');
    expect(finalNode).toBeDefined();
  });

  it('generates dynamic Arthur diary with nostalgia text when loop > 0', () => {
    const freshRun: NarrativeState = {
      empathy: 0,
      logic: 0,
      routeB1: 'A',
      routeB2: 'A1',
      loop: 0,
    };
    const freshDiary = getArthurDiary(freshRun);
    expect(freshDiary.nostalgia).toBe(false);
    expect(freshDiary.pages.length).toBe(3);

    const loopRun: NarrativeState = {
      empathy: 2,
      logic: 1,
      routeB1: 'B',
      routeB2: 'B2',
      loop: 2,
    };
    const loopDiary = getArthurDiary(loopRun);
    expect(loopDiary.nostalgia).toBe(true);
    expect(loopDiary.pages[2]).toContain('Elena');
  });

  it('emits the exact collectible key for every ending path', () => {
    expect(endingFor('n_b3_final', baseState({ routeB2: 'A1' }))).toBe('A1');
    expect(endingFor('n_b3_final', baseState({ routeB2: 'B1' }))).toBe('B1');
    expect(endingFor('n_b3_final', baseState({ routeB2: 'B2', logic: 1 }))).toBe('B2lock');
    expect(endingFor('r3f')).toBe('rebut');
    expect(endingFor('paradox')).toBe('paradox');
    expect(endingFor('true_end')).toBe('true');
  });
});
