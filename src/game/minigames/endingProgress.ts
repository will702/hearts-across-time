import { LORE_IDS } from '../narrative/lore';
import {
  ENDING_KEYS,
  ERA_IDS,
  type ChallengeResult,
  type EndingKey,
  type RunState,
} from '../systems/SaveSystem';

export type EndingPiece = {
  key: EndingKey;
  index: number;
  title: string;
  detail: string;
};

export const ENDING_PIECES: EndingPiece[] = [
  { key: 'A1', index: 1, title: 'MISI YANG DITINGGALKAN', detail: 'Kasus A1 • penelitian dihentikan' },
  { key: 'B1', index: 2, title: 'FORMULA YANG BOCOR', detail: 'Kasus B1 • formula disalahgunakan' },
  { key: 'B2lock', index: 3, title: 'HATI YANG TERKUNCI', detail: 'Kasus B2 • kapsul tetap terkunci' },
  { key: 'rebut', index: 4, title: 'WAKTU YANG DIREBUT', detail: 'Rebut paksa • dendam bertahan' },
  { key: 'paradox', index: 5, title: 'PARADOKS TERAKHIR', detail: 'Paradoks waktu • 2088' },
  { key: 'true', index: 6, title: 'AKHIR SEJATI', detail: 'Break the Loop' },
];

export type EndingProgress = {
  fresh: boolean;
  total: number;
  complete: boolean;
  unlocked: Record<EndingKey, boolean>;
};

export function deriveEndingProgress(
  endings: Readonly<Partial<Record<EndingKey, 1>>>,
  awardedKey: EndingKey,
): EndingProgress {
  const unlocked = Object.fromEntries(
    ENDING_KEYS.map(key => [key, key === awardedKey || endings[key] === 1]),
  ) as Record<EndingKey, boolean>;
  const total = ENDING_KEYS.filter(key => unlocked[key]).length;
  return {
    fresh: endings[awardedKey] !== 1,
    total,
    complete: total === ENDING_KEYS.length,
    unlocked,
  };
}

export type RunRecap = {
  loop: number;
  empathy: number;
  logic: number;
  routes: [string, string];
  challenges: Array<{ era: string; result: ChallengeResult }>;
  loreFound: number;
  loreTotal: number;
  loreComplete: boolean;
};

export function buildRunRecap(
  run: RunState,
  inspected: Readonly<Record<string, boolean | 1 | undefined>>,
): RunRecap {
  const loreFound = LORE_IDS.filter(id => Boolean(inspected[id])).length;
  return {
    loop: Math.max(0, Math.floor(run.loop)),
    empathy: Math.max(0, Math.floor(run.empathy)),
    logic: Math.max(0, Math.floor(run.logic)),
    routes: [
      run.routeB1 ? `RUTE 1${run.routeB1}` : 'RUTE 1—',
      run.routeB2 ? `RUTE 2${run.routeB2}` : 'RUTE 2—',
    ],
    challenges: ERA_IDS.map(era => ({ era, result: run.challenges[era] })),
    loreFound,
    loreTotal: LORE_IDS.length,
    loreComplete: loreFound === LORE_IDS.length,
  };
}
