import { describe, expect, it } from 'vitest';
import {
  CIRCUIT_BOARDS,
  EVACUATION_BOARDS,
  applyEvacuationStep,
  circuitBoardsForLoop,
  circuitDifficultyForLoop,
  evacuationBoardsForLoop,
  evacuationPatientCountForLoop,
  evacuationPursuerIntervalForLoop,
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
        expect(board.patients).toHaveLength(evacuationPatientCountForLoop(loop));
        expect(new Set(board.patients.map(patient => `${patient.x},${patient.y}`)).size)
          .toBe(board.patients.length);
        expect(board.blocked).not.toContainEqual(board.start);
        expect(board.blocked).not.toContainEqual(board.patient);
        expect(board.blocked).not.toContainEqual(board.goal);
        expect(board.blocked).not.toContainEqual(board.pursuer);
        expect(hasRoute(board, board.start, board.patient)).toBe(true);
        board.patients.forEach((patient) => {
          expect(board.blocked).not.toContainEqual(patient);
          expect(hasRoute(board, board.start, patient)).toBe(true);
          expect(hasRoute(board, patient, board.goal)).toBe(true);
        });
        expect(hasRoute(board, board.pursuer, board.start)).toBe(true);
      }
    }
    expect(signatures.size).toBe(8);
    expect(evacuationPatientCountForLoop(0)).toBe(1);
    expect(evacuationPatientCountForLoop(1)).toBe(2);
    expect(evacuationPatientCountForLoop(2)).toBe(2);
    expect(evacuationPatientCountForLoop(3)).toBe(3);
    expect(evacuationPursuerIntervalForLoop(1)).toBeLessThan(evacuationPursuerIntervalForLoop(0));
    expect(evacuationPursuerIntervalForLoop(99)).toBe(1050);
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
      expect(board.tiles.every(tile => tile.pipeMask !== 0)).toBe(true);

      const decoysRotated = board.tiles.map((tile, index) => tile.targetMask ? 0 : (index % 3) + 1);
      expect(isCircuitComplete(board, decoysRotated)).toBe(true);
      const broken = [...solved];
      const hint = board.tiles.findIndex(tile => tile.targetMask !== 0);
      broken[hint] = 1;
      expect(isCircuitComplete(board, broken)).toBe(false);
      expect(firstCircuitHint(board, broken)).toBe(hint);
    }
  });

  it('mengganti sirkuit setiap loop, menaikkan kesulitan, dan selalu dapat diselesaikan', () => {
    const signatures = new Set<string>();
    const activeCounts: number[] = [];
    for (let loop = 0; loop < 8; loop += 1) {
      const boards = circuitBoardsForLoop(loop);
      signatures.add(JSON.stringify(boards));
      activeCounts.push(boards.reduce(
        (total, board) => total + board.tiles.filter(tile => tile.targetMask !== 0).length,
        0,
      ));
      for (const board of boards) {
        expect(board.tiles).toHaveLength(board.width * board.height);
        expect(board.tiles.every(tile => tile.pipeMask !== 0)).toBe(true);
        const solved = board.tiles.map(() => 0);
        expect(isCircuitComplete(board, solved)).toBe(true);
        expect(isCircuitComplete(board, board.tiles.map(tile => tile.initialRotation))).toBe(false);
        expect(firstCircuitHint(board, board.tiles.map(tile => tile.initialRotation))).not.toBeNull();
      }
    }

    expect(signatures.size).toBe(8);
    expect(activeCounts[1]).toBeGreaterThan(activeCounts[0]);
    expect(activeCounts[2]).toBeGreaterThan(activeCounts[1]);
    expect(activeCounts.slice(3)).toEqual([36, 36, 36, 36, 36]);
    expect(circuitDifficultyForLoop(0)).toBe('NORMAL');
    expect(circuitDifficultyForLoop(1)).toBe('SULIT');
    expect(circuitDifficultyForLoop(2)).toBe('EKSTREM');
  });
});
