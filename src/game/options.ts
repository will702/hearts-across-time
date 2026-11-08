export const OPTIONS_KEY = 'hat_opts';

export type GameOptions = {
  vol: number;
  volMus: number;
  volSfx: number;
  textSpd: number;
  textScale: number;
  reduceMotion: boolean;
};

export const DEFAULT_OPTIONS: GameOptions = {
  vol: 0.9,
  volMus: 1,
  volSfx: 1,
  textSpd: 1,
  textScale: 1,
  reduceMotion: false,
};

function bounded(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

export function normalizeOptions(value: unknown): GameOptions {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    vol: bounded(source.vol, DEFAULT_OPTIONS.vol, 0, 1),
    volMus: bounded(source.volMus, DEFAULT_OPTIONS.volMus, 0, 1),
    volSfx: bounded(source.volSfx, DEFAULT_OPTIONS.volSfx, 0, 1),
    textSpd: bounded(source.textSpd, DEFAULT_OPTIONS.textSpd, 0.5, 3),
    textScale: bounded(source.textScale, DEFAULT_OPTIONS.textScale, 1, 1.22),
    reduceMotion: source.reduceMotion === true,
  };
}

export function loadOptions(storage: Pick<Storage, 'getItem'>): GameOptions {
  try {
    return normalizeOptions(JSON.parse(storage.getItem(OPTIONS_KEY) ?? '{}'));
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

export function saveOptions(storage: Pick<Storage, 'setItem'>, options: GameOptions): void {
  try {
    storage.setItem(OPTIONS_KEY, JSON.stringify(normalizeOptions(options)));
  } catch {
    // Storage can be unavailable in privacy mode; runtime options still apply.
  }
}
