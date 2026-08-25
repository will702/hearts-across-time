import { describe, expect, it } from 'vitest';
import {
  CIRCUIT_BOARDS,
  EVACUATION_BOARDS,
  applyEvacuationStep,
  firstCircuitHint,
  isCircuitComplete,
  microfilmHint,
  nextEvacuationStep,
} from '../../src/game/minigames/challengeRules';

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
