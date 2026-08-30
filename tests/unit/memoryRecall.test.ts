import { describe, expect, it } from 'vitest';

import {
  MEMORY_RECALL_QUESTIONS,
  memoryRecallQuestionForLoop,
} from '../../src/game/minigames/memoryRecall';

describe('kuis ingatan antarloops', () => {
  it('menyediakan delapan soal dengan jawaban yang valid', () => {
    expect(MEMORY_RECALL_QUESTIONS).toHaveLength(8);
    expect(new Set(MEMORY_RECALL_QUESTIONS.map(question => question.id)).size).toBe(8);
    MEMORY_RECALL_QUESTIONS.forEach((question) => {
      expect(question.options).toHaveLength(3);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(question.options.length);
    });
  });

  it('memberikan soal berbeda pada delapan loop berurutan dan stabil saat reload', () => {
    const firstCycle = Array.from({ length: 8 }, (_, loop) => memoryRecallQuestionForLoop(loop));
    expect(new Set(firstCycle.map(question => question.id)).size).toBe(8);
    firstCycle.forEach((question, loop) => {
      expect(memoryRecallQuestionForLoop(loop)).toEqual(question);
    });
    expect(memoryRecallQuestionForLoop(8)).toEqual(firstCycle[0]);
  });
});
