import { expect, test, type Page, type TestInfo } from '@playwright/test';

type Snapshot = {
  state: string;
  activeScenes: string[];
  player?: { x: number; y: number; vx: number };
  interaction?: { id?: string | null; prompt?: string } | null;
  stage?: string;
  step?: number;
  band?: number;
  cursor?: number;
  target?: number | { x: number; y: number; w: number; h: number } | { rx: number; ry: number } | null;
  rx?: number;
  ry?: number;
  vital?: number;
  serum?: number;
  targets?: { vital: number; serum: number };
  pieces?: Array<{ poly: [number, number][]; ox: number; oy: number; placed: boolean }>;
  selectedPiece?: number;
  menuSelection?: number;
  glueLines?: boolean[];
  glueTrace?: number[];
  watchRepair?: {
    ring: number;
    angles: number[];
    targets: number[];
    locked: boolean[];
    assisted: boolean;
  };
  minigame?: string;
  playerX?: number;
  activeNode?: number;
  completedNodes?: number;
  modal?: boolean;
  ending?: boolean;
  progress?: {
    differences: number;
    roses: number;
    dinnerPeople: Array<string | null>;
    dinnerFoods: Array<string | null>;
    cats: number;
    chemistry: string[];
  };
};

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const hat = (window as typeof window & { __HAT?: { snapshot: () => Snapshot } }).__HAT;
    if (!hat) throw new Error('window.__HAT belum tersedia');
    return hat.snapshot();
  });
}

async function canvasPoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const bounds = await page.locator('#game canvas').boundingBox();
  if (!bounds) throw new Error('Canvas Phaser tidak terlihat');
  return { x: bounds.x + x / GAME_WIDTH * bounds.width, y: bounds.y + y / GAME_HEIGHT * bounds.height };
}

async function attachCanvas(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await testInfo.attach(name, { body: await page.locator('#game canvas').screenshot(), contentType: 'image/png' });
}

async function walkTo(page: Page, id: string): Promise<void> {
  await page.keyboard.down('ArrowRight');
  try {
    await expect.poll(async () => (await snapshot(page)).interaction?.id, { timeout: 8_000 }).toBe(id);
  } finally {
    await page.keyboard.up('ArrowRight');
  }
}

async function walkToBonusNode(page: Page, index: number): Promise<void> {
  const targetX = [150, 365, 580, 795, 1010][index];
  for (let attempt = 0; attempt < 120; attempt++) {
    const state = await snapshot(page);
    if (state.activeNode === index) return;
    const key = (state.playerX ?? 0) < targetX ? 'ArrowRight' : 'ArrowLeft';
    await page.keyboard.down(key);
    await page.waitForTimeout(50);
    await page.keyboard.up(key);
  }
  throw new Error(`Elena tidak mencapai simpul bonus ${index + 1}: ${JSON.stringify(await snapshot(page))}`);
}

async function openBonusNode(page: Page, index: number): Promise<void> {
  await walkToBonusNode(page, index);
  for (let attempt = 0; attempt < 10; attempt++) {
    await page.keyboard.down('Space');
    await page.waitForTimeout(50);
    await page.keyboard.up('Space');
    if ((await snapshot(page)).modal) return;
  }
  throw new Error(`Simpul bonus ${index + 1} tidak dapat dibuka`);
}

function pointInPolygon(poly: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function interiorPoint(poly: [number, number][]): [number, number] {
  const minX = Math.min(...poly.map(point => point[0]));
  const maxX = Math.max(...poly.map(point => point[0]));
  const minY = Math.min(...poly.map(point => point[1]));
  const maxY = Math.max(...poly.map(point => point[1]));
  for (let y = minY + 5; y < maxY; y += 8) {
    for (let x = minX + 5; x < maxX; x += 8) if (pointInPolygon(poly, x, y)) return [x, y];
  }
  throw new Error('Pecahan tidak memiliki titik interior');
}

async function solveAssembly(page: Page, expectedPieces: number): Promise<void> {
  for (let index = expectedPieces - 1; index >= 0; index--) {
    const state = await snapshot(page);
    const piece = state.pieces?.[index];
    const target = state.target;
    if (!piece || !target || typeof target === 'number' || 'rx' in target) throw new Error('Snapshot puzzle tidak lengkap');
    const [localX, localY] = interiorPoint(piece.poly);
    const from = await canvasPoint(page, target.x + piece.ox + localX, target.y + piece.oy + localY);
    const to = await canvasPoint(page, target.x + localX, target.y + localY);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(80);
    if (!(await snapshot(page)).pieces?.[index]?.placed) {
      await page.keyboard.press(String(index + 1));
      await expect.poll(async () => (await snapshot(page)).selectedPiece).toBe(index);
      for (const [axis, negative, positive] of [
        ['ox', 'ArrowLeft', 'ArrowRight'],
        ['oy', 'ArrowUp', 'ArrowDown'],
      ] as const) {
        for (let attempt = 0; attempt < 80; attempt++) {
          const offset = (await snapshot(page)).pieces?.[index]?.[axis];
          if (typeof offset !== 'number' || Math.abs(offset) <= 20) break;
          const key = offset > 0 ? negative : positive;
          await page.keyboard.down(key);
          await page.waitForTimeout(50);
          await page.keyboard.up(key);
        }
        expect(Math.abs((await snapshot(page)).pieces?.[index]?.[axis] ?? 999)).toBeLessThanOrEqual(20);
      }
      await page.keyboard.press('Space');
    }
    await expect.poll(async () => Boolean((await snapshot(page)).pieces?.[index]?.placed)).toBe(true);
  }
}

async function lockCryoStep(page: Page, value: 'vital' | 'serum', target: 'vital' | 'serum', expectedStep: number): Promise<void> {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    const state = await snapshot(page);
    const current = state[value];
    const goal = state.targets?.[target];
    if (typeof current === 'number' && typeof goal === 'number' && Math.abs(current - goal) < 0.065) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(34);
      await page.keyboard.up('Space');
      await page.waitForTimeout(20);
      if ((await snapshot(page)).stage === 'success' || expectedStep === (await snapshot(page)).step) return;
    } else {
      await page.waitForTimeout(10);
    }
  }
  throw new Error(`Parameter krio ${value} tidak dapat dikunci`);
}

test.describe('Phaser Native Full Port E2E', () => {
  test('@smoke @visual completes Watch repair and Spotlight challenge in 1944', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('hat_opts', JSON.stringify({ reduceMotion: true, textSpd: 2, vol: 0 }));
      localStorage.setItem('hat_save', JSON.stringify({
        saveVersion: 2,
        game: {
          era: '1944',
          playerX: 330,
          S: {
            empathy: 0, logic: 0, routeB1: '', routeB2: '', loop: 0,
            watchTargets: [0.31, 0.64, 0.87],
            watchRepaired: false, roseRepaired: false, gemAligned: false, photoRepaired: false,
            challenges: { '1944': null, '1968': null, '1999': null }, inventory: {}, diaryRead: false,
          },
        },
        endings: {}, inspected: {},
      }));
    });

    await page.goto('/?qa=1');
    await expect.poll(async () => (await snapshot(page)).state).toBe('title');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await snapshot(page)).state).toBe('era1944');
    await attachCanvas(page, testInfo, 'era1944-native');
    await walkTo(page, 'watch');
    await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).state).toBe('watchrepair');
    await attachCanvas(page, testInfo, 'watchrepair-native');

    const left = await canvasPoint(page, 310, 478);
    const right = await canvasPoint(page, 650, 478);
    const lock = await canvasPoint(page, 480, 478);
    for (let ring = 0; ring < 3; ring++) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const state = await snapshot(page);
        const watch = state.watchRepair;
        if (!watch) throw new Error('Snapshot arloji tidak tersedia');
        const current = watch.angles[ring];
        const target = watch.targets[ring];
        const signed = ((target - current + 1.5) % 1) - 0.5;
        if (Math.abs(signed) <= 0.06) break;
        await page.mouse.click(signed > 0 ? right.x : left.x, signed > 0 ? right.y : left.y);
      }
      await page.mouse.click(lock.x, lock.y);
      if (ring < 2) await expect.poll(async () => (await snapshot(page)).watchRepair?.ring).toBe(ring + 1);
    }
    await expect.poll(async () => (await snapshot(page)).state).toBe('era1944');

    await walkTo(page, 'spotlight');
    await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).state).toBe('spotlight_challenge');
    await attachCanvas(page, testInfo, 'spotlight-native');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await snapshot(page)).stage).toBe('play');
    await attachCanvas(page, testInfo, 'spotlight-play-native');
    await page.keyboard.down('ArrowRight');
    try {
      await expect.poll(async () => (await snapshot(page)).state, { timeout: 25_000 }).toBe('era1944');
    } finally {
      await page.keyboard.up('ArrowRight');
    }
  });

  test('@smoke @visual completes Rose puzzle and Signal tune in 1968', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
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
    await attachCanvas(page, testInfo, 'era1968-native');

    await walkTo(page, 'rose');
    await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).state).toBe('rosepuzzle');
    await attachCanvas(page, testInfo, 'rose-native');
    await solveAssembly(page, 8);
    await expect.poll(async () => (await snapshot(page)).state).toBe('era1968');

    await walkTo(page, 'signal');
    await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).state).toBe('signaltune');
    await attachCanvas(page, testInfo, 'signal-native');
    await page.keyboard.press('Enter');
    for (let band = 0; band < 3; band++) {
      const state = await snapshot(page);
      if (typeof state.target !== 'number') throw new Error('Target sinyal tidak tersedia');
      const point = await canvasPoint(page, 190 + state.target * 580, 220);
      await page.mouse.click(point.x, point.y);
      await page.keyboard.press('Space');
      if (band < 2) await expect.poll(async () => (await snapshot(page)).band).toBe(band + 1);
    }
    await expect.poll(async () => (await snapshot(page)).state).toBe('era1968');
  });

  test('@smoke @visual completes Gem, Photo, and Cryo mini-games in 1999', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
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
    await attachCanvas(page, testInfo, 'era1999-native');

    await walkTo(page, 'gem');
    await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).state).toBe('gemalign');
    await attachCanvas(page, testInfo, 'gem-native');
    const gem = await snapshot(page);
    if (typeof gem.rx !== 'number' || typeof gem.ry !== 'number' || !gem.target || typeof gem.target === 'number' || !('rx' in gem.target)) {
      throw new Error('Snapshot permata tidak lengkap');
    }
    const start = await canvasPoint(page, 480, 236);
    const end = await canvasPoint(
      page,
      480 + (gem.target.ry - gem.ry) / 0.012,
      236 + (gem.target.rx - gem.rx) / 0.012,
    );
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => (await snapshot(page)).state).toBe('era1999');

    await walkTo(page, 'photo');
    await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).state).toBe('photopuzzle');
    await attachCanvas(page, testInfo, 'photo-native');
    await solveAssembly(page, 4);
    await expect.poll(async () => (await snapshot(page)).stage).toBe('glue');
    const seam = await canvasPoint(page, 480, 126);
    await page.mouse.click(seam.x, seam.y);
    const traced = await snapshot(page);
    expect(traced.glueLines?.[0]).toBe(false);
    expect(traced.glueTrace?.[0]).toBeGreaterThan(0);
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).state).toBe('era1999');

    await walkTo(page, 'cryo');
    await page.keyboard.press('Space');
    await expect.poll(async () => (await snapshot(page)).state).toBe('cryobalance');
    await attachCanvas(page, testInfo, 'cryo-native');
    await page.keyboard.press('Enter');
    await lockCryoStep(page, 'vital', 'vital', 1);
    await lockCryoStep(page, 'serum', 'serum', 2);
    await expect.poll(async () => (await snapshot(page)).state).toBe('era1999');
  });

  test('@smoke @visual completes every Bonus 2088 mini-game and epilogue', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
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

    // Hold each input until Phaser consumes it on a game frame.
    for (const selection of [2, 3]) {
      await page.keyboard.down('ArrowDown');
      try {
        await expect.poll(async () => (await snapshot(page)).menuSelection).toBe(selection);
      } finally {
        await page.keyboard.up('ArrowDown');
      }
    }
    await page.keyboard.down('Enter');
    try {
      await expect.poll(async () => (await snapshot(page)).state).toBe('bonus2088');
    } finally {
      await page.keyboard.up('Enter');
    }
    await attachCanvas(page, testInfo, 'bonus-world-native');

    await openBonusNode(page, 0);
    await expect.poll(async () => (await snapshot(page)).modal).toBe(true);
    await attachCanvas(page, testInfo, 'bonus-differences-native');
    for (let i = 0; i < 10; i++) await page.keyboard.press('Enter');
    await expect.poll(async () => (await snapshot(page)).completedNodes).toBe(1);
    await page.keyboard.press('Escape');

    await openBonusNode(page, 1);
    for (let i = 0; i < 5; i++) await page.keyboard.press('Enter');
    await expect.poll(async () => (await snapshot(page)).progress?.roses).toBe(5);
    await attachCanvas(page, testInfo, 'bonus-rose-code-native');
    await page.keyboard.type('2088');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await snapshot(page)).completedNodes).toBe(2);
    await page.keyboard.press('Escape');

    await openBonusNode(page, 2);
    await attachCanvas(page, testInfo, 'bonus-dinner-native');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await snapshot(page)).completedNodes).toBe(3);
    await page.keyboard.press('Escape');

    await openBonusNode(page, 3);
    await attachCanvas(page, testInfo, 'bonus-cats-native');
    for (let i = 0; i < 18; i++) await page.keyboard.press('Enter');
    await expect.poll(async () => (await snapshot(page)).completedNodes).toBe(4);
    await page.keyboard.press('Escape');

    await openBonusNode(page, 4);
    await attachCanvas(page, testInfo, 'bonus-chemistry-native');
    for (let i = 0; i < 3; i++) await page.keyboard.press('Enter');
    await expect.poll(async () => (await snapshot(page)).completedNodes).toBe(5);
    await page.keyboard.press('Escape');

    await page.keyboard.down('ArrowRight');
    try {
      await expect.poll(async () => (await snapshot(page)).playerX, { timeout: 8_000 }).toBeGreaterThan(1125);
    } finally {
      await page.keyboard.up('ArrowRight');
    }
    await page.keyboard.down('Space');
    try {
      await expect.poll(async () => (await snapshot(page)).ending).toBe(true);
    } finally {
      await page.keyboard.up('Space');
    }
    await attachCanvas(page, testInfo, 'bonus-ending-native');
    await page.keyboard.down('Enter');
    try {
      await expect.poll(async () => (await snapshot(page)).state).toBe('title');
    } finally {
      await page.keyboard.up('Enter');
    }
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('hat_save') ?? '{}').bonusSeen)).toBe(true);
  });
});
