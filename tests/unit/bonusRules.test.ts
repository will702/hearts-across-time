import { describe, expect, it } from 'vitest';
import {
  CAT_SPOTS,
  CHEMISTRY_ORDER,
  DIFFERENCE_SPOTS,
  advanceChemistry,
  findCatAt,
  findDifferenceAt,
  isBonusCode,
  isDinnerValid,
} from '../../src/game/minigames/bonusRules';

describe('Bonus 2088 legacy-parity rules', () => {
  it('retains all ten paired difference targets and ignores targets already found', () => {
    expect(DIFFERENCE_SPOTS).toHaveLength(10);
    const found = Array<boolean>(10).fill(false);
    const first = DIFFERENCE_SPOTS[0];
    expect(findDifferenceAt(first.a[0] * 880, first.a[1] * 400, 880, 400, found)).toBe(0);
    found[0] = true;
    expect(findDifferenceAt(first.b[0] * 880, first.b[1] * 400, 880, 400, found)).toBe(-1);
  });

  it('retains all eighteen calibrated cat targets', () => {
    expect(CAT_SPOTS).toHaveLength(18);
    const found = Array<boolean>(18).fill(false);
    const last = CAT_SPOTS[17];
    expect(findCatAt(last[0] * 690, last[1] * 386, 690, 386, found)).toBe(17);
    found[17] = true;
    expect(findCatAt(last[0] * 690, last[1] * 386, 690, 386, found)).toBe(-1);
  });

  it('validates the complete four-person and four-food seating constraints', () => {
    expect(isDinnerValid(
      ['Dina', 'Adi', 'Budi', 'Citra'],
      ['nasi', 'spaghetti', 'steak', 'udang'],
    )).toBe(true);
    expect(isDinnerValid(
      ['Dina', 'Adi', 'Budi', 'Citra'],
      ['steak', 'spaghetti', 'nasi', 'udang'],
    )).toBe(false);
    expect(isDinnerValid(
      ['Dina', 'Budi', 'Adi', 'Citra'],
      ['nasi', 'spaghetti', 'udang', 'steak'],
    )).toBe(false);
  });

  it('requires watch, rose, then gem and resets a wrong chemistry sequence', () => {
    expect(CHEMISTRY_ORDER).toEqual(['watch', 'rose', 'gem']);
    const one = advanceChemistry([], 'watch');
    const two = advanceChemistry(one.order, 'rose');
    const three = advanceChemistry(two.order, 'gem');
    expect(three).toEqual({ order: ['watch', 'rose', 'gem'], correct: true, complete: true });
    expect(advanceChemistry(one.order, 'gem')).toEqual({ order: [], correct: false, complete: false });
  });

  it('accepts only the revealed year 2088', () => {
    expect(isBonusCode('2088')).toBe(true);
    expect(isBonusCode(' 2088 ')).toBe(true);
    expect(isBonusCode('1999')).toBe(false);
  });
});
