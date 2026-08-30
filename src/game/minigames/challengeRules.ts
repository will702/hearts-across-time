export type GridPoint = { x: number; y: number };

export type EvacuationBoard = {
  width: number;
  height: number;
  start: GridPoint;
  patient: GridPoint;
  patients: readonly GridPoint[];
  goal: GridPoint;
  pursuer: GridPoint;
  blocked: readonly GridPoint[];
};

const EVACUATION_BOARD_TEMPLATES: readonly EvacuationBoard[] = [
  {
    width: 4,
    height: 3,
    start: { x: 0, y: 2 },
    patient: { x: 1, y: 0 },
    patients: [{ x: 1, y: 0 }, { x: 3, y: 2 }, { x: 0, y: 0 }],
    goal: { x: 3, y: 0 },
    pursuer: { x: 2, y: 0 },
    blocked: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
  },
  {
    width: 5,
    height: 4,
    start: { x: 0, y: 3 },
    patient: { x: 2, y: 1 },
    patients: [{ x: 2, y: 1 }, { x: 4, y: 3 }, { x: 0, y: 0 }],
    goal: { x: 4, y: 0 },
    pursuer: { x: 2, y: 3 },
    blocked: [{ x: 1, y: 3 }, { x: 1, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 0 }],
  },
  {
    width: 5,
    height: 4,
    start: { x: 0, y: 1 },
    patient: { x: 2, y: 0 },
    patients: [{ x: 2, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }],
    goal: { x: 4, y: 2 },
    pursuer: { x: 2, y: 3 },
    blocked: [{ x: 1, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 1 }, { x: 3, y: 3 }],
  },
];

function rotateEvacuationPoint(point: GridPoint, width: number, height: number, turns: number): GridPoint {
  let rotated = { ...point };
  let rotatedWidth = width;
  let rotatedHeight = height;
  for (let turn = 0; turn < turns; turn += 1) {
    rotated = { x: rotatedHeight - 1 - rotated.y, y: rotated.x };
    [rotatedWidth, rotatedHeight] = [rotatedHeight, rotatedWidth];
  }
  return rotated;
}

/** Delapan orientasi deterministik; loop berikutnya selalu memakai medan yang berbeda. */
export function evacuationBoardsForLoop(loop: number): readonly EvacuationBoard[] {
  const normalizedLoop = Math.max(0, Math.floor(loop));
  const variant = normalizedLoop % 8;
  const patientCount = evacuationPatientCountForLoop(normalizedLoop);
  const turns = variant % 4;
  const reflected = variant >= 4;
  return EVACUATION_BOARD_TEMPLATES.map((board) => {
    const swapped = turns % 2 === 1;
    const width = swapped ? board.height : board.width;
    const height = swapped ? board.width : board.height;
    const transform = (point: GridPoint): GridPoint => {
      const rotated = rotateEvacuationPoint(point, board.width, board.height, turns);
      return reflected ? { x: width - 1 - rotated.x, y: rotated.y } : rotated;
    };
    return {
      width,
      height,
      start: transform(board.start),
      patient: transform(board.patient),
      patients: board.patients.slice(0, patientCount).map(transform),
      goal: transform(board.goal),
      pursuer: transform(board.pursuer),
      blocked: board.blocked.map(transform),
    };
  });
}

export function evacuationPatientCountForLoop(loop: number): 1 | 2 | 3 {
  const normalized = Math.max(0, Math.floor(loop));
  if (normalized >= 3) return 3;
  if (normalized >= 1) return 2;
  return 1;
}

export function evacuationPursuerIntervalForLoop(loop: number): number {
  const normalized = Math.max(0, Math.floor(loop));
  return Math.max(1800, 3600 - normalized * 250);
}

export const EVACUATION_BOARDS: readonly EvacuationBoard[] = evacuationBoardsForLoop(0);

export type EvacuationStep = 'advance' | 'backtrack' | 'invalid';

function pointKey(point: GridPoint): string {
  return `${point.x},${point.y}`;
}

export function samePoint(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function isOpen(board: EvacuationBoard, point: GridPoint): boolean {
  return point.x >= 0 && point.x < board.width && point.y >= 0 && point.y < board.height
    && !board.blocked.some(blocked => samePoint(blocked, point));
}

/** Jalur kritis terpendek yang harus selalu tersedia bagi pemain. */
export function evacuationRoute(
  board: EvacuationBoard,
  start: GridPoint,
  goal: GridPoint,
): GridPoint[] {
  const queue: GridPoint[][] = [[start]];
  const seen = new Set([pointKey(start)]);
  const directions = [{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  while (queue.length) {
    const route = queue.shift()!;
    const tail = route[route.length - 1];
    if (samePoint(tail, goal)) return route;
    for (const direction of directions) {
      const candidate = { x: tail.x + direction.x, y: tail.y + direction.y };
      const key = pointKey(candidate);
      if (!seen.has(key) && isOpen(board, candidate)) {
        seen.add(key);
        queue.push([...route, candidate]);
      }
    }
  }
  return [];
}

function pursuerForbiddenCells(board: EvacuationBoard, protectedRoute: readonly GridPoint[]): Set<string> {
  return new Set([
    ...protectedRoute.map(pointKey),
    ...board.patients.map(pointKey),
    pointKey(board.goal),
  ]);
}

/**
 * Memindahkan pengejar keluar dari jalur kritis ketika sasaran pemain berganti.
 * Dengan begitu musuh tetap mengancam, tetapi tidak bisa membuat soft-lock.
 */
export function safeEvacuationPursuerPosition(
  board: EvacuationBoard,
  pursuer: GridPoint,
  player: GridPoint,
  objective: GridPoint,
): GridPoint {
  const protectedRoute = evacuationRoute(board, player, objective);
  const forbidden = pursuerForbiddenCells(board, protectedRoute);
  if (!forbidden.has(pointKey(pursuer)) && isOpen(board, pursuer)) return { ...pursuer };

  const candidates: GridPoint[] = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const candidate = { x, y };
      if (isOpen(board, candidate) && !forbidden.has(pointKey(candidate))) candidates.push(candidate);
    }
  }
  candidates.sort((a, b) => {
    const distanceA = Math.abs(a.x - pursuer.x) + Math.abs(a.y - pursuer.y);
    const distanceB = Math.abs(b.x - pursuer.x) + Math.abs(b.y - pursuer.y);
    if (distanceA !== distanceB) return distanceA - distanceB;
    const playerDistanceA = Math.abs(a.x - player.x) + Math.abs(a.y - player.y);
    const playerDistanceB = Math.abs(b.x - player.x) + Math.abs(b.y - player.y);
    return playerDistanceB - playerDistanceA;
  });
  return candidates[0] ? { ...candidates[0] } : { ...pursuer };
}

/** Satu langkah mengejar tanpa memasuki sisa jalur kritis pemain. */
export function nextEvacuationPursuerStep(
  board: EvacuationBoard,
  pursuer: GridPoint,
  player: GridPoint,
  objective: GridPoint,
): GridPoint {
  const safePursuer = safeEvacuationPursuerPosition(board, pursuer, player, objective);
  if (!samePoint(safePursuer, pursuer)) return safePursuer;

  const futureRoute = evacuationRoute(board, player, objective).slice(1);
  const forbidden = pursuerForbiddenCells(board, futureRoute);
  const candidates = [
    { x: pursuer.x + 1, y: pursuer.y },
    { x: pursuer.x, y: pursuer.y - 1 },
    { x: pursuer.x, y: pursuer.y + 1 },
    { x: pursuer.x - 1, y: pursuer.y },
  ].filter(candidate => isOpen(board, candidate) && !forbidden.has(pointKey(candidate)));
  candidates.sort((a, b) => (
    Math.abs(a.x - player.x) + Math.abs(a.y - player.y)
    - Math.abs(b.x - player.x) - Math.abs(b.y - player.y)
  ));
  return candidates[0] ? { ...candidates[0] } : { ...pursuer };
}

export function applyEvacuationStep(
  board: EvacuationBoard,
  path: readonly GridPoint[],
  next: GridPoint,
): { path: GridPoint[]; result: EvacuationStep } {
  const current = path[path.length - 1];
  const previous = path[path.length - 2];
  if (previous && samePoint(previous, next)) return { path: path.slice(0, -1), result: 'backtrack' };
  const adjacent = Math.abs(current.x - next.x) + Math.abs(current.y - next.y) === 1;
  const visited = path.some(point => samePoint(point, next));
  if (!adjacent || !isOpen(board, next) || visited) return { path: [...path], result: 'invalid' };
  return { path: [...path, next], result: 'advance' };
}

export function nextEvacuationStep(board: EvacuationBoard, path: readonly GridPoint[]): GridPoint | null {
  const current = path[path.length - 1];
  const avoided = new Set(path.slice(0, -1).map(pointKey));
  const queue: GridPoint[][] = [[current]];
  const seen = new Set([pointKey(current)]);
  const directions = [{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

  while (queue.length) {
    const route = queue.shift()!;
    const tail = route[route.length - 1];
    if (samePoint(tail, board.goal)) return route[1] ?? board.goal;
    for (const direction of directions) {
      const candidate = { x: tail.x + direction.x, y: tail.y + direction.y };
      const key = pointKey(candidate);
      if (!seen.has(key) && !avoided.has(key) && isOpen(board, candidate)) {
        seen.add(key);
        queue.push([...route, candidate]);
      }
    }
  }
  return path[path.length - 2] ?? null;
}

export const MICROFILM_TARGETS = [5, 2, 4] as const;
export const MICROFILM_STARTS = [0, 6, 1] as const;

export function microfilmHint(current: number, target: number): -1 | 0 | 1 {
  return current === target ? 0 : current < target ? 1 : -1;
}

const NORTH = 1;
const EAST = 2;
const SOUTH = 4;
const WEST = 8;
const DIRECTIONS = [
  { bit: NORTH, opposite: SOUTH, dx: 0, dy: -1 },
  { bit: EAST, opposite: WEST, dx: 1, dy: 0 },
  { bit: SOUTH, opposite: NORTH, dx: 0, dy: 1 },
  { bit: WEST, opposite: EAST, dx: -1, dy: 0 },
] as const;

export type CircuitTile = {
  /** Orientasi jalur bantuan/solusi utama. Nol berarti pipa pengecoh. */
  targetMask: number;
  /** Bentuk pipa yang selalu digambar dan dapat diputar pemain. */
  pipeMask: number;
  initialRotation: number;
};
export type CircuitBoard = {
  label: 'DAYA' | 'PENDINGIN' | 'SERUM';
  width: number;
  height: number;
  tiles: readonly CircuitTile[];
  sourceIndex: number;
  sinkIndex: number;
};

export function rotateCircuitMask(mask: number, rotation: number): number {
  let result = mask;
  for (let turn = 0; turn < ((rotation % 4) + 4) % 4; turn += 1) {
    result = ((result << 1) & 15) | ((result & WEST) ? NORTH : 0);
  }
  return result;
}

function directionBit(from: GridPoint, to: GridPoint): number {
  if (to.x === from.x && to.y === from.y - 1) return NORTH;
  if (to.x === from.x + 1 && to.y === from.y) return EAST;
  if (to.x === from.x && to.y === from.y + 1) return SOUTH;
  if (to.x === from.x - 1 && to.y === from.y) return WEST;
  throw new Error('Jalur sirkuit harus memakai petak yang bersebelahan');
}

function makeCircuitBoard(
  label: CircuitBoard['label'],
  path: readonly GridPoint[],
  rotations: readonly number[],
  decoySeed = 0,
): CircuitBoard {
  const width = 4;
  const height = 3;
  const decoyMasks = [NORTH | SOUTH, EAST | WEST, NORTH | EAST, EAST | SOUTH, SOUTH | WEST, WEST | NORTH];
  const tiles: CircuitTile[] = Array.from({ length: width * height }, (_, index) => ({
    targetMask: 0,
    pipeMask: decoyMasks[(decoySeed + index * 5) % decoyMasks.length],
    initialRotation: (decoySeed + index * 3) % 4,
  }));
  path.forEach((point, index) => {
    const neighbors = [path[index - 1], path[index + 1]].filter(Boolean) as GridPoint[];
    const targetMask = neighbors.reduce((mask, neighbor) => mask | directionBit(point, neighbor), 0);
    tiles[point.y * width + point.x] = {
      targetMask,
      pipeMask: targetMask,
      initialRotation: rotations[index] % 4,
    };
  });
  return {
    label,
    width,
    height,
    tiles,
    sourceIndex: path[0].y * width + path[0].x,
    sinkIndex: path[path.length - 1].y * width + path[path.length - 1].x,
  };
}

const CIRCUIT_LABELS = ['DAYA', 'PENDINGIN', 'SERUM'] as const;

const MEDIUM_CIRCUIT_PATHS: readonly (readonly GridPoint[])[] = [
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  [{ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
];

const HARD_CIRCUIT_PATHS: readonly (readonly GridPoint[])[] = [
  MEDIUM_CIRCUIT_PATHS[2],
  [...MEDIUM_CIRCUIT_PATHS[2], { x: 2, y: 2 }],
  [...MEDIUM_CIRCUIT_PATHS[2], { x: 2, y: 2 }, { x: 3, y: 2 }],
];

const EXPERT_CIRCUIT_PATHS: readonly (readonly GridPoint[])[] = [
  HARD_CIRCUIT_PATHS[2],
  [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 1 }, { x: 3, y: 0 }],
  HARD_CIRCUIT_PATHS[2],
];

function transformCircuitPath(path: readonly GridPoint[], variant: number): GridPoint[] {
  const transformed = path.map(point => ({
    x: variant & 1 ? 3 - point.x : point.x,
    y: variant & 2 ? 2 - point.y : point.y,
  }));
  return variant & 4 ? transformed.reverse() : transformed;
}

function scrambledCircuitBoard(
  label: CircuitBoard['label'],
  path: readonly GridPoint[],
  loop: number,
  system: number,
): CircuitBoard {
  const solved = makeCircuitBoard(label, path, path.map(() => 0), loop * 11 + system * 7);
  return {
    ...solved,
    tiles: solved.tiles.map((tile, index) => {
      if (!tile.targetMask) {
        return {
          ...tile,
          initialRotation: (loop * 3 + system * 2 + index * 5) % 4,
        };
      }
      const straight = tile.targetMask === (NORTH | SOUTH) || tile.targetMask === (EAST | WEST);
      const options = straight ? [1, 3] : [1, 2, 3];
      return {
        ...tile,
        initialRotation: options[(loop * 5 + system * 3 + index * 7) % options.length],
      };
    }),
  };
}

export const CIRCUIT_BOARDS: readonly CircuitBoard[] = [
  makeCircuitBoard('DAYA', [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }], [1, 1, 2, 1, 1, 3]),
  makeCircuitBoard('PENDINGIN', [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 }], [3, 1, 2, 1, 3, 2]),
  makeCircuitBoard('SERUM', [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }], [1, 2, 1, 3, 1, 2, 3]),
] as const;

export type CircuitDifficulty = 'NORMAL' | 'SULIT' | 'EKSTREM';

export function circuitDifficultyForLoop(loop: number): CircuitDifficulty {
  const normalized = Math.max(0, Math.floor(loop));
  return normalized === 0 ? 'NORMAL' : normalized === 1 ? 'SULIT' : 'EKSTREM';
}

/**
 * Mengganti bentuk dan orientasi sirkuit pada setiap loop. Kesulitan naik lewat
 * jumlah konduit aktif: 6–7 (normal), 8–10 (sulit), 10–12 lalu 12 (ekstrem).
 * Delapan transformasi memberi variasi replay yang deterministik dan teruji.
 */
export function circuitBoardsForLoop(loop: number): readonly CircuitBoard[] {
  const normalized = Math.max(0, Math.floor(loop));
  if (normalized === 0) return CIRCUIT_BOARDS;

  const paths = normalized === 1
    ? MEDIUM_CIRCUIT_PATHS
    : normalized === 2
      ? HARD_CIRCUIT_PATHS
      : EXPERT_CIRCUIT_PATHS;
  const variant = normalized % 8;

  return CIRCUIT_LABELS.map((label, system) => scrambledCircuitBoard(
    label,
    transformCircuitPath(paths[system], (variant + system * 3) % 8),
    normalized,
    system,
  ));
}

export function circuitMask(board: CircuitBoard, rotations: readonly number[], index: number): number {
  const tile = board.tiles[index];
  return tile ? rotateCircuitMask(tile.pipeMask, rotations[index] ?? 0) : 0;
}

export function isCircuitComplete(board: CircuitBoard, rotations: readonly number[]): boolean {
  const visited = new Set<number>();
  const queue = [board.sourceIndex];

  while (queue.length) {
    const index = queue.shift()!;
    if (visited.has(index)) continue;
    visited.add(index);
    const x = index % board.width;
    const y = Math.floor(index / board.width);
    const mask = circuitMask(board, rotations, index);

    for (const direction of DIRECTIONS) {
      if (!(mask & direction.bit)) continue;
      const nx = x + direction.dx;
      const ny = y + direction.dy;
      if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) return false;
      const neighbor = ny * board.width + nx;
      if (!(circuitMask(board, rotations, neighbor) & direction.opposite)) return false;
      if (!visited.has(neighbor)) queue.push(neighbor);
    }
  }

  // Pipa yang tidak pernah menerima aliran dari sumber adalah pengecoh dan
  // tidak wajib menjadi bagian dari rangkaian yang berhasil.
  return visited.has(board.sinkIndex);
}

export function firstCircuitHint(board: CircuitBoard, rotations: readonly number[]): number | null {
  for (let index = 0; index < board.tiles.length; index += 1) {
    const tile = board.tiles[index];
    if (tile.targetMask && circuitMask(board, rotations, index) !== tile.targetMask) return index;
  }
  return null;
}
