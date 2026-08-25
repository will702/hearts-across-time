import { expect, test, type CDPSession, type Page } from '@playwright/test';

type Snapshot = {
  state: string;
  titleInteractive?: boolean;
  player?: {
    x: number;
    y: number;
    vx: number;
    blocked: boolean | { left: boolean; right: boolean; down: boolean };
  };
  interaction?: { id?: string | null; prompt?: string } | null;
  touchControls?: boolean;
  prologuePage?: number;
  prologueStarted?: boolean;
};

type Diagnostics = {
  errors: string[];
  missing: string[];
};

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

function collectDiagnostics(page: Page): Diagnostics {
  const diagnostics: Diagnostics = { errors: [], missing: [] };
  page.on('pageerror', error => diagnostics.errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') diagnostics.errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', request => {
    diagnostics.errors.push(`request: ${request.url()} ${request.failure()?.errorText ?? ''}`);
  });
  page.on('response', response => {
    if (response.status() === 404) diagnostics.missing.push(response.url());
  });
  return diagnostics;
}

async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const hat = (window as typeof window & { __HAT?: { snapshot: () => Snapshot } }).__HAT;
    if (!hat) throw new Error('window.__HAT belum tersedia');
    return hat.snapshot();
  });
}

async function openTitle(page: Page, path = '/?qa=1'): Promise<Diagnostics> {
  const diagnostics = collectDiagnostics(page);
  await page.addInitScript(() => {
    let seed = 0x484154;
    Math.random = () => {
      seed = seed + 0x6D2B79F5 | 0;
      let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
      value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
    if (!sessionStorage.getItem('hat_qa_initialized')) {
      localStorage.clear();
      localStorage.setItem('hat_opts', JSON.stringify({ reduceMotion: true, textSpd: 2, vol: 0 }));
      sessionStorage.setItem('hat_qa_initialized', '1');
    }
  });
  await page.goto(path);
  await expect.poll(async () => (await snapshot(page)).state).toBe('title');
  await expect.poll(async () => Boolean((await snapshot(page)).titleInteractive)).toBe(true);
  return diagnostics;
}

async function pressUntilState(page: Page, key: string, expected: string, timeout = 12_000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if ((await snapshot(page)).state === expected) return;
    await page.keyboard.press(key);
    await page.waitForTimeout(70);
  }
  expect((await snapshot(page)).state).toBe(expected);
}

async function startNewCycle(page: Page): Promise<void> {
  await pressUntilState(page, 'Enter', 'era1944');
}

function player(state: Snapshot): NonNullable<Snapshot['player']> {
  expect(state.player, 'snapshot pemain harus tersedia').toBeTruthy();
  return state.player as NonNullable<Snapshot['player']>;
}

async function holdKeyUntil(
  page: Page,
  key: 'ArrowLeft' | 'ArrowRight',
  condition: (state: Snapshot) => boolean,
  timeout = 5_000,
): Promise<Snapshot> {
  let matched: Snapshot | undefined;
  await page.keyboard.down(key);
  try {
    await expect.poll(async () => {
      const state = await snapshot(page);
      if (condition(state)) matched = state;
      return Boolean(matched);
    }, { timeout }).toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
  return matched ?? snapshot(page);
}

async function reachWatch(page: Page): Promise<Snapshot> {
  return holdKeyUntil(page, 'ArrowRight', state => state.interaction?.id === 'watch');
}

async function walkAnimation(page: Page): Promise<{
  key: string | null;
  frameCount: number;
  frame: string;
  texture: string;
}> {
  return page.evaluate(() => {
    const hat = (window as typeof window & {
      __HAT?: { game: { scene: { getScene: (key: string) => unknown } } };
    }).__HAT;
    if (!hat) throw new Error('Runtime Phaser tidak tersedia');
    const era = hat.game.scene.getScene('Era1944Scene') as unknown as {
      player: {
        anims: { currentAnim: { key: string; frames: unknown[] } | null };
        frame: { name: string | number };
        texture: { key: string };
      };
    };
    return {
      key: era.player.anims.currentAnim?.key ?? null,
      frameCount: era.player.anims.currentAnim?.frames.length ?? 0,
      frame: String(era.player.frame.name),
      texture: era.player.texture.key,
    };
  });
}

async function canvasPoint(page: Page, gameX: number, gameY: number): Promise<{ x: number; y: number }> {
  const bounds = await page.locator('#game canvas').boundingBox();
  if (!bounds) throw new Error('Canvas Phaser tidak terlihat');
  return {
    x: bounds.x + gameX / GAME_WIDTH * bounds.width,
    y: bounds.y + gameY / GAME_HEIGHT * bounds.height,
  };
}

async function tapUntil(
  page: Page,
  gameX: number,
  gameY: number,
  condition: (state: Snapshot) => boolean,
  description: string,
): Promise<Snapshot> {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    const state = await snapshot(page);
    if (condition(state)) return state;
    const point = await canvasPoint(page, gameX, gameY);
    await page.touchscreen.tap(point.x, point.y);
    await page.waitForTimeout(90);
  }
  const state = await snapshot(page);
  throw new Error(`${description}: ${JSON.stringify(state)}`);
}

async function tapUntilState(page: Page, gameX: number, gameY: number, expected: string): Promise<Snapshot> {
  return tapUntil(page, gameX, gameY, state => state.state === expected, `State ${expected} tidak tercapai`);
}

async function holdTouchUntil(
  page: Page,
  cdp: CDPSession,
  gameX: number,
  gameY: number,
  condition: (state: Snapshot) => boolean,
): Promise<Snapshot> {
  let matched: Snapshot | undefined;
  const point = await canvasPoint(page, gameX, gameY);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: point.x, y: point.y }],
  });
  try {
    await expect.poll(async () => {
      const state = await snapshot(page);
      if (condition(state)) matched = state;
      return Boolean(matched);
    }, { timeout: 5_000 }).toBe(true);
  } finally {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  return matched ?? snapshot(page);
}

test('@smoke game, aset wajib, dan title siap tanpa error', async ({ page }) => {
  const diagnostics = await openTitle(page);
  const state = await snapshot(page);
  const loadErrors = await page.evaluate(() => {
    const hat = (window as typeof window & { __HAT?: { game: { registry: { get: (key: string) => unknown } } } }).__HAT;
    return hat?.game.registry.get('loadErrors');
  });

  expect(state.titleInteractive).toBe(true);
  await expect(page.locator('#game canvas')).toBeVisible();
  expect(loadErrors).toEqual([]);
  expect(diagnostics.missing).toEqual([]);
  expect(diagnostics.errors).toEqual([]);
});

test('@smoke Siklus Baru mencapai traversal 1944', async ({ page }) => {
  await openTitle(page);
  await startNewCycle(page);
  const state = await snapshot(page);
  expect(state.state).toBe('era1944');
  expect(player(state).y).toBeGreaterThan(0);
});

test('@smoke canvas logis dan physics debug dapat diinspeksi', async ({ page }) => {
  const diagnostics = await openTitle(page, '/?qa=1&physicsDebug=1');
  await startNewCycle(page);
  const debug = await page.evaluate(() => {
    const hat = (window as typeof window & {
      __HAT?: {
        game: {
          canvas: HTMLCanvasElement;
          scene: { getScene: (key: string) => { physics: { world: { drawDebug: boolean } } } };
        };
      };
    }).__HAT;
    if (!hat) throw new Error('Runtime Phaser tidak tersedia');
    const era = hat.game.scene.getScene('Era1944Scene');
    return { width: hat.game.canvas.width, height: hat.game.canvas.height, drawDebug: era.physics.world.drawDebug };
  });

  expect(debug).toEqual({ width: 960, height: 540, drawDebug: true });
  expect(diagnostics.errors).toEqual([]);
  expect(diagnostics.missing).toEqual([]);
});

test('@smoke keyboard menggerakkan pemain ke kanan dan kiri', async ({ page }) => {
  await openTitle(page);
  await startNewCycle(page);
  const startX = player(await snapshot(page)).x;
  const right = await holdKeyUntil(page, 'ArrowRight', state => player(state).x > startX + 45);
  const rightX = player(right).x;
  const left = await holdKeyUntil(page, 'ArrowLeft', state => player(state).x < rightX - 30);

  expect(rightX).toBeGreaterThan(startX);
  expect(player(left).x).toBeLessThan(rightX);
});

test('@smoke @visual walk Elena memakai 13 frame unik pada cadence lama', async ({ page }, testInfo) => {
  await openTitle(page);
  await startNewCycle(page);
  await page.evaluate(() => window.__HAT?.game.registry.set('reduceMotion', false));

  const frames: string[] = [];
  await page.keyboard.down('ArrowRight');
  try {
    await expect.poll(async () => (await walkAnimation(page)).texture).toBe('elena-walk');
    const animation = await walkAnimation(page);
    expect(animation.key).toBe('elena-walk-neutral');
    expect(animation.frameCount).toBe(13);
    for (let i = 0; i < 8; i += 1) {
      frames.push((await walkAnimation(page)).frame);
      await page.waitForTimeout(50);
    }
    await testInfo.attach('elena-walk-native', {
      body: await page.locator('#game canvas').screenshot(),
      contentType: 'image/png',
    });
  } finally {
    await page.keyboard.up('ArrowRight');
  }

  expect(new Set(frames).size).toBeGreaterThan(2);
});

test('@smoke arloji memblokir pemain sebelum selesai', async ({ page }) => {
  await openTitle(page);
  await startNewCycle(page);
  const blocked = await holdKeyUntil(page, 'ArrowRight', state => {
    const current = player(state);
    return current.x > 375 && Math.abs(current.vx) < 1;
  });

  expect(player(blocked).x).toBeLessThan(398);
});

test('@smoke prompt hanya muncul dalam jarak dan interaksi membuka arloji', async ({ page }) => {
  await openTitle(page);
  await startNewCycle(page);
  const far = await snapshot(page);
  expect(far.interaction?.id ?? null).toBeNull();
  expect(far.interaction?.prompt ?? '').toBe('');

  const near = await reachWatch(page);
  expect(near.interaction?.prompt).toContain('ARLOJI');

  await pressUntilState(page, 'Space', 'watchrepair');
});

test('@smoke pause dan resume mengembalikan traversal', async ({ page }) => {
  await openTitle(page);
  await startNewCycle(page);
  await pressUntilState(page, 'Escape', 'paused');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('hat_opts') ?? '{}').vol)).toBe(0.1);
  await pressUntilState(page, 'Escape', 'era1944');
});

test('@smoke menu jeda lalu Lanjutkan mereset state UI', async ({ page }) => {
  await openTitle(page);
  await startNewCycle(page);
  await pressUntilState(page, 'Escape', 'paused');
  await pressUntilState(page, 'm', 'title');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(100);
  await pressUntilState(page, 'Enter', 'era1944');

  const uiPauseState = await page.evaluate(() => {
    const hat = (window as typeof window & {
      __HAT?: { game: { scene: { getScene: (key: string) => unknown; isPaused: (key: string) => boolean } } };
    }).__HAT;
    const ui = hat?.game.scene.getScene('UIScene') as { isPaused?: () => boolean } | undefined;
    return { manager: hat?.game.scene.isPaused('UIScene'), runtime: ui?.isPaused?.() };
  });
  expect(uiPauseState).toEqual({ manager: false, runtime: false });
});

test('@smoke save, reload, dan Lanjutkan memulihkan posisi valid', async ({ page }) => {
  await openTitle(page);
  await startNewCycle(page);
  await holdKeyUntil(page, 'ArrowRight', state => player(state).x > 175);
  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem('hat_save');
    return raw ? JSON.parse(raw).game?.playerX ?? 0 : 0;
  }), { timeout: 4_000 }).toBeGreaterThan(100);
  const savedX = await page.evaluate(() => JSON.parse(localStorage.getItem('hat_save') ?? '{}').game.playerX as number);

  await page.reload();
  await expect.poll(async () => (await snapshot(page)).state).toBe('title');
  await expect.poll(async () => Boolean((await snapshot(page)).titleInteractive)).toBe(true);
  await startNewCycle(page);
  expect(Math.abs(player(await snapshot(page)).x - savedX)).toBeLessThan(4);
});

test('@smoke kontrol sentuh menyediakan gerak dan aksi setara', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await openTitle(page);
    await tapUntilState(page, 480, 356, 'prologue');
    await tapUntil(page, 680, 451, state => state.prologuePage === 1, 'Onboarding tidak mencapai halaman 2');
    await tapUntil(page, 680, 451, state => state.prologuePage === 2, 'Onboarding tidak mencapai halaman 3');
    await tapUntilState(page, 680, 451, 'dialogue');
    await tapUntilState(page, 480, 472, 'era1944');
    expect((await snapshot(page)).touchControls).toBe(true);

    const cdp = await context.newCDPSession(page);
    const moved = await holdTouchUntil(page, cdp, 132, 484, state => player(state).x > 140);
    expect(player(moved).x).toBeGreaterThan(90);
    await holdTouchUntil(page, cdp, 132, 484, state => state.interaction?.id === 'watch');
    const action = await canvasPoint(page, 882, 482);
    await page.touchscreen.tap(action.x, action.y);
    await expect.poll(async () => (await snapshot(page)).state).toBe('watchrepair');
  } finally {
    await context.close();
  }
});

test('@visual checkpoint Phaser-native: title, 1944, dan arloji', async ({ page }, testInfo) => {
  const diagnostics = await openTitle(page);
  const canvas = page.locator('#game canvas');
  await testInfo.attach('title-native', { body: await canvas.screenshot(), contentType: 'image/png' });
  await startNewCycle(page);
  await testInfo.attach('era1944-native', { body: await canvas.screenshot(), contentType: 'image/png' });
  await reachWatch(page);
  await pressUntilState(page, 'Space', 'watchrepair');
  await testInfo.attach('watchrepair-native', { body: await canvas.screenshot(), contentType: 'image/png' });
  expect(diagnostics.missing).toEqual([]);
  expect(diagnostics.errors).toEqual([]);
});
