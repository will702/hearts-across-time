import { LEGACY_ENTRY_PATH, isLegacyScene } from '../narrative/storyData';
import { SaveSystem, type EraId, type RunState } from '../systems/SaveSystem';

export type Navigate = (path: string) => void;

function browserNavigate(path: string): void {
  globalThis.location.assign(path);
}

export class LegacyStateAdapter {
  constructor(
    private readonly saves: SaveSystem,
    private readonly navigate: Navigate = browserNavigate,
  ) {}

  enter(era: EraId, run: RunState): string {
    if (!isLegacyScene(era)) throw new RangeError(`Era ${era} bukan scene legacy`);
    const save = this.saves.load();
    this.saves.save({ ...save, game: { era, S: run } });
    this.navigate(LEGACY_ENTRY_PATH);
    return LEGACY_ENTRY_PATH;
  }
}
