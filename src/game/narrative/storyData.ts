import type { EraId } from '../systems/SaveSystem';

export const AUTHORITATIVE_STORY_SOURCE = '/src/data/story.js' as const;
export const LEGACY_ENTRY_PATH = '/legacy.html?continue=1' as const;
export const LEGACY_SCENES = ['1968', '1999'] as const satisfies readonly EraId[];
export type LegacyScene = (typeof LEGACY_SCENES)[number];

export const STORY_ENTRY_POINTS = {
  newCycle: 'prologue',
  era1944: 'war_intro',
  era1968A: 'bunker_intro',
  era1968B: 'lab_intro',
  era1999: 'final_lab_intro',
} as const;

export function isLegacyScene(value: unknown): value is LegacyScene {
  return value === '1968' || value === '1999';
}
