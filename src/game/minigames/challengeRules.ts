export type GridPoint = { x: number; y: number };

export type EvacuationBoard = {
  width: number;
  height: number;
  start: GridPoint;
  goal: GridPoint;
  blocked: readonly GridPoint[];
};

export const EVACUATION_BOARDS: readonly EvacuationBoard[] = [
  { width: 4, height: 3, start: { x: 0, y: 2 }, goal: { x: 3, y: 0 }, blocked: [{ x: 1, y: 1 }, { x: 2, y: 2 }] },
  { width: 5, height: 4, start: { x: 0, y: 3 }, goal: { x: 4, y: 0 }, blocked: [{ x: 1, y: 3 }, { x: 1, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 0 }] },
  { width: 5, height: 4, start: { x: 0, y: 1 }, goal: { x: 4, y: 2 }, blocked: [{ x: 1, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 1 }, { x: 3, y: 3 }] },
] as const;

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

export type CircuitTile = { targetMask: number; initialRotation: number };
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
): CircuitBoard {
  const width = 4;
  const height = 3;
  const tiles: CircuitTile[] = Array.from({ length: width * height }, () => ({ targetMask: 0, initialRotation: 0 }));
  path.forEach((point, index) => {
    const neighbors = [path[index - 1], path[index + 1]].filter(Boolean) as GridPoint[];
    tiles[point.y * width + point.x] = {
      targetMask: neighbors.reduce((mask, neighbor) => mask | directionBit(point, neighbor), 0),
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

export const CIRCUIT_BOARDS: readonly CircuitBoard[] = [
  makeCircuitBoard('DAYA', [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }], [1, 1, 2, 1, 1, 3]),
  makeCircuitBoard('PENDINGIN', [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 }], [3, 1, 2, 1, 3, 2]),
  makeCircuitBoard('SERUM', [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }], [1, 2, 1, 3, 1, 2, 3]),
] as const;

export function circuitMask(board: CircuitBoard, rotations: readonly number[], index: number): number {
  const tile = board.tiles[index];
  return tile ? rotateCircuitMask(tile.targetMask, rotations[index] ?? 0) : 0;
}

export function isCircuitComplete(board: CircuitBoard, rotations: readonly number[]): boolean {
  const active = board.tiles.map((tile, index) => tile.targetMask ? index : -1).filter(index => index >= 0);
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

  return visited.has(board.sinkIndex) && active.every(index => visited.has(index));
}

export function firstCircuitHint(board: CircuitBoard, rotations: readonly number[]): number | null {
  for (let index = 0; index < board.tiles.length; index += 1) {
    const tile = board.tiles[index];
    if (tile.targetMask && circuitMask(board, rotations, index) !== tile.targetMask) return index;
  }
  return null;
}
