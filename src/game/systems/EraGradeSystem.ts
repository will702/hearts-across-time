/* Grading "cetak buku harian perang" legacy (world.js grade()) — lapisan overlay
   screen-space di atas dunia era, di bawah HUD UIScene. Semua layer non-interaktif
   (tidak pernah setInteractive) dan scrollFactor 0. */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { ensureFrostTexture, ensureGrainFrameTextures, ensurePaperFillTexture } from '../ui/paper';
import { ERA_TINT } from '../ui/theme';

export type EraGradeKey = '1944' | '1968A' | '1968B' | '1999' | '2088';

type GradeLayer =
  | Phaser.GameObjects.Rectangle
  | Phaser.GameObjects.Image
  | Phaser.GameObjects.TileSprite
  | Phaser.GameObjects.Graphics;

type RainDrop = { x: number; y: number; vy: number; w: number; h: number };

const GRADE_DEPTH = 800;
const GRAIN_SWAP_MS = 100;

/** Ubah 'rgba(140,70,30,.10)' → { color: 0x8c461e, alpha: 0.10 }. */
function parseRgba(value: string): { color: number; alpha: number } {
  const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(value.trim());
  if (!match) return { color: 0xffffff, alpha: 1 };
  return {
    color: (Number(match[1]) << 16) | (Number(match[2]) << 8) | Number(match[3]),
    alpha: match[4] === undefined ? 1 : Number(match[4]),
  };
}

/** Vignette radial: pusat transparan → tepi rgba(0,0,0,.38) (dalam H*.42 … H*.85). */
function ensureVignetteTexture(scene: Phaser.Scene): string {
  const key = 'ui-era-vignette';
  if (!scene.textures.exists(key)) {
    const ct = scene.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT);
    if (ct) {
      const c = ct.getContext() as unknown as CanvasRenderingContext2D;
      const cx = GAME_WIDTH / 2;
      const cy = GAME_HEIGHT / 2;
      const g = c.createRadialGradient(cx, cy, GAME_HEIGHT * 0.42, cx, cy, GAME_HEIGHT * 0.85);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.38)');
      c.fillStyle = g;
      c.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ct.refresh();
    }
  }
  return key;
}

/** Empat sudut cetak gelap rgba(8,5,3,.30) radius 215 dalam satu tekstur 960x540. */
function ensurePrintCornersTexture(scene: Phaser.Scene): string {
  const key = 'ui-print-corners';
  if (!scene.textures.exists(key)) {
    const ct = scene.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT);
    if (ct) {
      const c = ct.getContext() as unknown as CanvasRenderingContext2D;
      const corners: Array<[number, number]> = [
        [0, 0],
        [GAME_WIDTH, 0],
        [0, GAME_HEIGHT],
        [GAME_WIDTH, GAME_HEIGHT],
      ];
      corners.forEach(([cx, cy]) => {
        const g = c.createRadialGradient(cx, cy, 0, cx, cy, 215);
        g.addColorStop(0, 'rgba(8,5,3,.30)');
        g.addColorStop(1, 'rgba(8,5,3,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      });
      ct.refresh();
    }
  }
  return key;
}

/** Pola scanline CRT 4x3 (baris 2 gelap, baris 0 terang pudar) — 1968B. */
function ensureScanlineTexture(scene: Phaser.Scene): string {
  const key = 'ui-scanlines';
  if (!scene.textures.exists(key)) {
    const ct = scene.textures.createCanvas(key, 4, 3);
    if (ct) {
      const c = ct.getContext() as unknown as CanvasRenderingContext2D;
      c.fillStyle = 'rgba(165,222,242,.05)';
      c.fillRect(0, 0, 4, 1);
      c.fillStyle = 'rgba(6,12,16,.15)';
      c.fillRect(0, 2, 4, 1);
      ct.refresh();
    }
  }
  return key;
}

export class EraGradeSystem {
  private readonly scene: Phaser.Scene;
  private readonly era: EraGradeKey;
  private readonly layers: GradeLayer[] = [];
  private readonly grainKeys: string[];
  private readonly drops: RainDrop[] = [];
  private grain?: Phaser.GameObjects.TileSprite;
  private frost?: Phaser.GameObjects.Image;
  private scanlines?: Phaser.GameObjects.TileSprite;
  private rain?: Phaser.GameObjects.Graphics;
  private depth = GRADE_DEPTH;
  private lastTime = -1;

  constructor(scene: Phaser.Scene, era: EraGradeKey) {
    this.scene = scene;
    this.era = era;
    this.grainKeys = ensureGrainFrameTextures(scene);

    // 1. Tint multiply per era (ERA_TINT legacy).
    const tint = parseRgba(ERA_TINT[era]);
    this.track(this.addRect(tint.color, tint.alpha).setBlendMode(Phaser.BlendModes.MULTIPLY));

    // 2. Serat kertas multiply.
    this.track(scene.add.tileSprite(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, ensurePaperFillTexture(scene),
    ).setAlpha(0.09).setBlendMode(Phaser.BlendModes.MULTIPLY));

    // 3. Angkat hangat overlay.
    this.track(this.addRect(0xe9dabc, 0.07).setBlendMode(Phaser.BlendModes.OVERLAY));

    // 4. Vignette radial.
    this.track(scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ensureVignetteTexture(scene)));

    // 5. Sudut cetak.
    this.track(scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ensurePrintCornersTexture(scene)));

    // 6. Grain film animasi (ganti frame tiap 100ms saat !reduceMotion).
    this.grain = scene.add.tileSprite(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, this.grainKeys[0],
    ).setAlpha(0.05).setBlendMode(Phaser.BlendModes.OVERLAY);
    this.track(this.grain);

    this.createAtmospherics();
    this.setDepth(this.depth);
  }

  update(timeMs: number): void {
    const animated = !this.scene.registry.get('reduceMotion');
    const t = timeMs / 1000;

    if (this.grain && animated) {
      const frame = Math.floor(timeMs / GRAIN_SWAP_MS) % this.grainKeys.length;
      this.grain.setTexture(this.grainKeys[frame]);
    }

    if (this.frost) {
      this.frost.setAlpha(animated ? 0.42 + 0.1 * Math.sin(t * 0.8) : 0.55);
    }

    if (this.scanlines) {
      this.scanlines.tilePositionY = animated ? (t * 14) % 3 : 0;
    }

    if (this.rain) {
      this.rain.setVisible(animated);
      if (animated) {
        const dt = this.lastTime >= 0 ? Phaser.Math.Clamp(timeMs - this.lastTime, 0, 100) / 1000 : 0;
        this.drops.forEach((drop) => {
          drop.y += drop.vy * dt;
          // Goyang legacy: sin(t*.7 + y*.01)*.16 per frame 60fps (terakumulasi +-14px).
          drop.x += Math.sin(t * 0.7 + drop.y * 0.01) * 0.16 * dt * 60;
          if (drop.y > GAME_HEIGHT + 12) drop.y -= GAME_HEIGHT + 24;
        });
        this.renderRain();
      }
    }

    this.lastTime = timeMs;
  }

  setDepth(depth: number): this {
    this.depth = depth;
    this.layers.forEach((layer, index) => layer.setDepth(depth + index));
    return this;
  }

  destroy(): void {
    this.layers.forEach((layer) => layer.destroy());
    this.layers.length = 0;
    this.grain = undefined;
    this.frost = undefined;
    this.scanlines = undefined;
    this.rain = undefined;
  }

  /** Atmosfer khas era: beku 1999, scanline lab 1968B, tetes hujan lensa 1944. */
  private createAtmospherics(): void {
    if (this.era === '1999') {
      this.frost = this.scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ensureFrostTexture(this.scene))
        .setAlpha(this.scene.registry.get('reduceMotion') ? 0.55 : 0.42);
      this.track(this.frost);
      return;
    }

    if (this.era === '1968B') {
      this.scanlines = this.scene.add.tileSprite(
        GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, ensureScanlineTexture(this.scene),
      );
      this.track(this.scanlines);
      return;
    }

    if (this.era === '1944') {
      this.rain = this.scene.add.graphics();
      this.track(this.rain);
      for (let i = 0; i < 4; i += 1) {
        this.drops.push({
          x: GAME_WIDTH * (0.14 + 0.24 * i),
          y: 40 + i * 130,
          vy: 7 + i * 4,
          w: 2 + (i % 2),
          h: 7 + (i % 3) * 2,
        });
      }
      this.rain.setVisible(!this.scene.registry.get('reduceMotion'));
      this.renderRain();
    }
  }

  private addRect(color: number, alpha: number): Phaser.GameObjects.Rectangle {
    return this.scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color, alpha,
    );
  }

  private track(layer: GradeLayer): void {
    layer.setScrollFactor(0);
    this.layers.push(layer);
  }

  private renderRain(): void {
    if (!this.rain) return;
    this.rain.clear();
    this.rain.fillStyle(0xdee9f0, 0.10);
    this.drops.forEach((drop) => {
      this.rain?.fillEllipse(drop.x, drop.y, drop.w, drop.h);
    });
  }
}
