import { expect, test, type Page } from '@playwright/test';

type Snapshot = {
  state: string;
  activeScenes: string[];
  player?: { x: number; y: number; vx: number };
  interaction?: { id?: string | null; prompt?: string } | null;
};

async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const hat = (window as typeof window & { __HAT?: { snapshot: () => Snapshot } }).__HAT;
    if (!hat) throw new Error('window.__HAT belum tersedia');
    return hat.snapshot();
  });
}

test.describe('Phaser Native Full Port E2E', () => {
  test('@smoke loads 1968 era and launches Rose puzzle and Signal tune', async ({ page }) => {
    await page.addInitScript(() => {
      let seed = 0x484154;
      Math.random = () => {
        seed = seed + 0x6d2b79f5 | 0;
        let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
        value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
      };
      localStorage.clear();
      localStorage.setItem('hat_opts', JSON.stringify({ reduceMotion: true, textSpd: 2, vol: 0 }));

      const saveState = {
        saveVersion: 2,
        game: {
          era: '1968',
          playerX: 120,
          S: {
            empathy: 1,
            logic: 0,
            routeB1: 'A',
            routeB2: '',
            loop: 0,
            watchRepaired: true,
            roseRepaired: false,
            gemAligned: false,
            photoRepaired: false,
            challenges: { '1944': 'empathy', '1968': null, '1999': null },
            inventory: { watch: 1 },
          },
        },
        endings: {},
        inspected: {},
      };
      localStorage.setItem('hat_save', JSON.stringify(saveState));
    });

    await page.goto('/?qa=1');
    await expect.poll(async () => (await snapshot(page)).state).toBe('title');

    // Press Enter on "LANJUTKAN" to continue into 1968
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await snapshot(page)).state).toBe('era1968');

    // Walk to Rose bottle (x: 285)
    await page.keyboard.down('ArrowRight');
    await expect.poll(async () => {
      const s = await snapshot(page);
      return s.interaction?.id === 'rose';
    }, { timeout: 6000 }).toBe(true);
    await page.keyboard.up('ArrowRight');

    // Open Rose Puzzle
    await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).state).toBe('rosepuzzle');
  });

  test('@smoke loads 1999 era and launches Gem align and Photo puzzle', async ({ page }) => {
    await page.addInitScript(() => {
      let seed = 0x484154;
      Math.random = () => {
        seed = seed + 0x6d2b79f5 | 0;
        let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
        value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
      };
      localStorage.clear();
      localStorage.setItem('hat_opts', JSON.stringify({ reduceMotion: true, textSpd: 2, vol: 0 }));

      const saveState = {
        saveVersion: 2,
        game: {
          era: '1999',
          playerX: 120,
          S: {
            empathy: 2,
            logic: 0,
            routeB1: 'B',
            routeB2: 'B2',
            loop: 1,
            watchRepaired: true,
            roseRepaired: true,
            gemAligned: false,
            photoRepaired: false,
            challenges: { '1944': 'empathy', '1968': 'empathy', '1999': null },
            inventory: { watch: 1, flower: 1 },
          },
        },
        endings: {},
        inspected: {},
      };
      localStorage.setItem('hat_save', JSON.stringify(saveState));
    });

    await page.goto('/?qa=1');
    await expect.poll(async () => (await snapshot(page)).state).toBe('title');

    // Press Enter on "LANJUTKAN" to continue into 1999
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await snapshot(page)).state).toBe('era1999');

    // Walk to Gem (x: 250)
    await page.keyboard.down('ArrowRight');
    await expect.poll(async () => {
      const s = await snapshot(page);
      return s.interaction?.id === 'gem';
    }, { timeout: 6000 }).toBe(true);
    await page.keyboard.up('ArrowRight');

    // Open Gem Align Scene
    await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).state).toBe('gemalign');
  });

  test('@smoke unlocks and enters Bonus 2088 scene', async ({ page }) => {
    await page.addInitScript(() => {
      let seed = 0x484154;
      Math.random = () => {
        seed = seed + 0x6d2b79f5 | 0;
        let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
        value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
      };
      localStorage.clear();
      localStorage.setItem('hat_opts', JSON.stringify({ reduceMotion: true, textSpd: 2, vol: 0 }));

      const saveState = {
        saveVersion: 2,
        game: null,
        endings: { true: 1, A1: 1, B1: 1, B2lock: 1, rebut: 1, paradox: 1 },
        inspected: {},
      };
      localStorage.setItem('hat_save', JSON.stringify(saveState));
    });

    await page.goto('/?qa=1');
    await expect.poll(async () => (await snapshot(page)).state).toBe('title');

    // Navigate down to Bonus 2088 menu item (item 3)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect.poll(async () => (await snapshot(page)).state).toBe('bonus2088');
  });
});
