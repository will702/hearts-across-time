import type { RunState } from '../systems/SaveSystem';

export { LEGACY_SCENES } from './storyData';

export type StoryStage = 'title' | '1944' | 'legacy';

export function canTransition(from: StoryStage, to: StoryStage, run: RunState): boolean {
  if (from === 'title') return to === '1944';
  if (from === '1944') return to === 'legacy' && run.watchRepaired;
  return false;
}

export class StoryRunner {
  transition(from: StoryStage, to: StoryStage, run: RunState): boolean {
    return canTransition(from, to, run);
  }
}
