import { describe, expect, it } from 'vitest';
import { getArthurDiary, getStoryOps, type NarrativeState } from '../../src/game/narrative/storyScript';

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
});
