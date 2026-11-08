export const SAVE_VERSION = 2 as const;
export const SAVE_KEY = 'hat_save';

export const ERA_IDS = ['1944', '1968', '1999'] as const;
export type EraId = (typeof ERA_IDS)[number];

export const ENDING_KEYS = ['A1', 'B1', 'B2lock', 'rebut', 'paradox', 'true'] as const;
export type EndingKey = (typeof ENDING_KEYS)[number];
export type ChallengeResult = 'empathy' | 'logic' | null;
export type RouteB1 = '' | 'A' | 'B';
export type RouteB2 = '' | 'A1' | 'A2' | 'B1' | 'B2';

export interface RunState {
  empathy: number;
  logic: number;
  routeB1: RouteB1;
  routeB2: RouteB2;
  loop: number;
  challenges: Record<EraId, ChallengeResult>;
  inventory: Record<string, 1>;
  watchTargets: [number, number, number] | null;
  watchRepaired: boolean;
  roseRepaired: boolean;
  gemAligned: boolean;
  photoRepaired: boolean;
  diaryRead: boolean;
}

export interface SavedRun {
  era: EraId;
  S: RunState;
  playerX?: number;
}

export interface SaveData {
  saveVersion: typeof SAVE_VERSION;
  seen: Record<string, 1>;
  chosen: Record<string, 1>;
  game: SavedRun | null;
  endings: Partial<Record<EndingKey, 1>>;
  inspected: Record<string, 1>;
  introDone: boolean;
  tutorial: Record<string, 1>;
  bonusSeen?: boolean;
  loreToastDone?: boolean;
  [key: string]: unknown;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const KNOWN_SAVE_KEYS = new Set([
  'saveVersion', 'seen', 'chosen', 'game', 'endings', 'inspected', 'introDone', 'tutorial', 'bonusSeen', 'loreToastDone',
]);
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeKey(key: string): boolean {
  return !UNSAFE_KEYS.has(key);
}

function flag(value: unknown): value is true | 1 {
  return value === true || value === 1;
}

function flagMap(value: unknown): Record<string, 1> {
  const result: Record<string, 1> = {};
  if (!isRecord(value)) return result;
  for (const [key, entry] of Object.entries(value)) {
    if (safeKey(key) && flag(entry)) result[key] = 1;
  }
  return result;
}

function sanitizeJson(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): JsonValue | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (depth >= 20 || (typeof value !== 'object' || value === null)) return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map(entry => sanitizeJson(entry, seen, depth + 1) ?? null);
    seen.delete(value);
    return result;
  }
  const result: Record<string, JsonValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!safeKey(key)) continue;
    const clean = sanitizeJson(entry, seen, depth + 1);
    if (clean !== undefined) result[key] = clean;
  }
  seen.delete(value);
  return result;
}

function nonNegativeInteger(value: unknown): number {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : 0;
}

function nonNegativeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function challenge(value: unknown): ChallengeResult {
  return value === 'empathy' || value === 'logic' ? value : null;
}

function routeB1(value: unknown): RouteB1 {
  return value === 'A' || value === 'B' ? value : '';
}

function routeB2(value: unknown): RouteB2 {
  return value === 'A1' || value === 'A2' || value === 'B1' || value === 'B2' ? value : '';
}

function watchTargets(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  if (!value.every(entry => typeof entry === 'number' && Number.isFinite(entry) && entry >= 0 && entry <= 1)) return null;
  return [value[0] as number, value[1] as number, value[2] as number];
}

export function defaultRun(): RunState {
  return {
    empathy: 0,
    logic: 0,
    routeB1: '',
    routeB2: '',
    loop: 0,
    challenges: { '1944': null, '1968': null, '1999': null },
    inventory: {},
    watchTargets: null,
    watchRepaired: false,
    roseRepaired: false,
    gemAligned: false,
    photoRepaired: false,
    diaryRead: false,
  };
}

export function normalizeEra(value: unknown): EraId {
  return value === '1968' || value === '1999' ? value : '1944';
}

export function normalizeRun(value: unknown, era: EraId = '1944'): RunState {
  const source = isRecord(value) ? value : {};
  const challenges = isRecord(source.challenges) ? source.challenges : {};
  const run: RunState = {
    empathy: nonNegativeInteger(source.empathy),
    logic: nonNegativeInteger(source.logic),
    routeB1: routeB1(source.routeB1),
    routeB2: routeB2(source.routeB2),
    loop: nonNegativeInteger(source.loop),
    challenges: {
      '1944': challenge(challenges['1944']),
      '1968': challenge(challenges['1968']),
      '1999': challenge(challenges['1999']),
    },
    inventory: flagMap(source.inventory),
    watchTargets: watchTargets(source.watchTargets),
    watchRepaired: flag(source.watchRepaired),
    roseRepaired: flag(source.roseRepaired),
    gemAligned: flag(source.gemAligned),
    photoRepaired: flag(source.photoRepaired),
    diaryRead: flag(source.diaryRead),
  };

  if (run.inventory.watch && !run.watchRepaired) {
    if (era === '1944') delete run.inventory.watch;
    else run.watchRepaired = true;
  }
  if (run.inventory.flower && !run.roseRepaired) {
    if (era === '1968') delete run.inventory.flower;
    else run.roseRepaired = true;
  }
  if (run.inventory.water_gem && !run.gemAligned) {
    if (era === '1999') delete run.inventory.water_gem;
    else run.gemAligned = true;
  }
  if (run.inventory.arthur_photo && !run.photoRepaired) {
    if (era === '1999') delete run.inventory.arthur_photo;
    else run.photoRepaired = true;
  }
  return run;
}

function normalizeEndings(value: unknown): Partial<Record<EndingKey, 1>> {
  const source = isRecord(value) ? value : {};
  const endings: Partial<Record<EndingKey, 1>> = {};
  for (const key of ENDING_KEYS) if (flag(source[key])) endings[key] = 1;
  return endings;
}

export function allEndingsUnlocked(endings: Partial<Record<EndingKey, 1>>): boolean {
  return ENDING_KEYS.every(key => endings[key] === 1);
}

export function normalizeSave(value: unknown): SaveData {
  const source = isRecord(value) ? value : {};
  const extras: Record<string, JsonValue> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (KNOWN_SAVE_KEYS.has(key) || !safeKey(key)) continue;
    const clean = sanitizeJson(entry);
    if (clean !== undefined) extras[key] = clean;
  }

  let game: SavedRun | null = null;
  if (isRecord(source.game)) {
    const era = normalizeEra(source.game.era);
    const playerX = nonNegativeNumber(source.game.playerX);
    game = {
      era,
      S: normalizeRun(source.game.S, era),
      ...(playerX === undefined ? {} : { playerX }),
    };
  }

  return {
    ...extras,
    saveVersion: SAVE_VERSION,
    seen: flagMap(source.seen),
    chosen: flagMap(source.chosen),
    game,
    endings: normalizeEndings(source.endings),
    inspected: flagMap(source.inspected),
    introDone: flag(source.introDone),
    tutorial: flagMap(source.tutorial),
    bonusSeen: flag(source.bonusSeen),
    loreToastDone: flag(source.loreToastDone),
  };
}

function browserStorage(): StorageLike {
  if (typeof globalThis.localStorage === 'undefined') throw new Error('localStorage tidak tersedia');
  return globalThis.localStorage;
}

export class SaveSystem {
  private current = normalizeSave(null);

  constructor(private readonly storage: StorageLike = browserStorage()) {}

  get data(): SaveData {
    return this.current;
  }

  load(): SaveData {
    let raw: string | null;
    try {
      raw = this.storage.getItem(SAVE_KEY);
    } catch {
      this.current = normalizeSave(null);
      return this.current;
    }
    if (raw === null) {
      this.current = normalizeSave(null);
      return this.current;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    this.current = normalizeSave(parsed);
    this.persist(this.current);
    return this.current;
  }

  save(value: unknown): SaveData {
    this.current = normalizeSave(value);
    this.persist(this.current);
    return this.current;
  }

  beginCycle(): RunState {
    const run = defaultRun();
    this.save({ ...this.current, game: null });
    return run;
  }

  saveCycle(era: EraId, run: RunState, playerX?: number): SaveData {
    const nextPlayerX = playerX ?? (this.current.game?.era === era ? this.current.game.playerX : undefined);
    return this.save({
      ...this.current,
      game: { era, S: run, ...(nextPlayerX === undefined ? {} : { playerX: nextPlayerX }) },
    });
  }

  clearCycle(): SaveData {
    return this.save({ ...this.current, game: null });
  }

  markIntroDone(): SaveData {
    return this.save({ ...this.current, introDone: true });
  }

  clear(): void {
    try {
      this.storage.removeItem(SAVE_KEY);
    } catch {
      // Storage may be unavailable or full; gameplay remains usable in memory.
    }
    this.current = normalizeSave(null);
  }

  private persist(save: SaveData): void {
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      // Preserve the existing runtime's non-fatal localStorage behavior.
    }
  }
}
