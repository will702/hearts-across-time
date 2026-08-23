import type { RunState } from '../systems/SaveSystem';

export { LEGACY_SCENES } from './storyData';

export type StoryStage = 'title' | '1944' | '1968' | '1999' | 'bonus' | 'legacy';

export function canTransition(from: StoryStage, to: StoryStage, run: RunState): boolean {
  if (from === 'title') return to === '1944' || to === '1968' || to === '1999' || to === 'bonus';
  if (from === '1944') {
    if (to === 'legacy') return Boolean(run.watchRepaired);
    if (to === '1968') return Boolean(run.watchRepaired) && Boolean(run.challenges['1944']);
    return false;
  }
  if (from === '1968') return to === '1999' && Boolean(run.roseRepaired) && Boolean(run.challenges['1968']);
  if (from === '1999') return to === '1944' || to === 'bonus' || to === 'title';
  return false;
}

export class StoryRunner {
  transition(from: StoryStage, to: StoryStage, run: RunState): boolean {
    return canTransition(from, to, run);
  }
}
