import { describe, expect, it } from 'vitest';
import {
  CIRCUIT_BOARDS,
  EVACUATION_BOARDS,
  applyEvacuationStep,
  evacuationBoardsForLoop,
  firstCircuitHint,
  isCircuitComplete,
  microfilmHint,
  nextEvacuationStep,
  type EvacuationBoard,
  type GridPoint,
} from '../../src/game/minigames/challengeRules';

function hasRoute(board: EvacuationBoard, start: GridPoint, goal: GridPoint): boolean {
  const key = (point: GridPoint): string => `${point.x},${point.y}`;
  const blocked = new Set(board.blocked.map(key));
  const queue = [start];
  const seen = new Set([key(start)]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current.x === goal.x && current.y === goal.y) return true;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      const nextKey = key(next);
      if (next.x < 0 || next.x >= board.width || next.y < 0 || next.y >= board.height
        || blocked.has(nextKey) || seen.has(nextKey)) continue;
      seen.add(nextKey);
      queue.push(next);
    }
  }
  return false;
}

describe('Aturan challenge tiga era', () => {
  it('memajukan, menolak, dan membatalkan langkah peta evakuasi', () => {
    const board = EVACUATION_BOARDS[0];
    const start = [board.start];
    expect(applyEvacuationStep(board, start, { x: 1, y: 2 }).result).toBe('advance');
    expect(applyEvacuationStep(board, start, { x: 1, y: 1 }).result).toBe('invalid');
    const advanced = applyEvacuationStep(board, start, { x: 1, y: 2 }).path;
    expect(applyEvacuationStep(board, advanced, board.start)).toEqual({ path: start, result: 'backtrack' });
    expect(nextEvacuationStep(board, start)).toEqual({ x: 0, y: 1 });
  });

  it('mengganti orientasi peta setiap loop dan selalu menyediakan rute jemput-antar', () => {
    const signatures = new Set<string>();
    for (let loop = 0; loop < 8; loop += 1) {
      const boards = evacuationBoardsForLoop(loop);
      signatures.add(JSON.stringify(boards));
      for (const board of boards) {
        expect(board.blocked).not.toContainEqual(board.start);
        expect(board.blocked).not.toContainEqual(board.patient);
        expect(board.blocked).not.toContainEqual(board.goal);
        expect(hasRoute(board, board.start, board.patient)).toBe(true);
        expect(hasRoute(board, board.patient, board.goal)).toBe(true);
      }
    }
    expect(signatures.size).toBe(8);
  });

  it('memberi arah registrasi mikrofilm yang tepat', () => {
    expect(microfilmHint(1, 5)).toBe(1);
    expect(microfilmHint(6, 2)).toBe(-1);
    expect(microfilmHint(4, 4)).toBe(0);
  });

  it('menerima hanya rangkaian lengkap tanpa kebocoran', () => {
    for (const board of CIRCUIT_BOARDS) {
      const solved = board.tiles.map(() => 0);
      expect(isCircuitComplete(board, solved)).toBe(true);
      const broken = [...solved];
      const hint = board.tiles.findIndex(tile => tile.targetMask !== 0);
      broken[hint] = 1;
      expect(isCircuitComplete(board, broken)).toBe(false);
      expect(firstCircuitHint(board, broken)).toBe(hint);
    }
  });
});
