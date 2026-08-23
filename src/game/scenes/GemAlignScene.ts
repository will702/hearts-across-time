import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

export type GemAlignData = {
  run: RunState;
  save: SaveSystem;
  onComplete: () => void;
};

const GEM_TARGET = { rx: 0.62, ry: -0.86 };

function gemAngleDist(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

export class GemAlignScene extends Phaser.Scene {
  private gemData!: GemAlignData;
  private soundManager?: SoundManager;
  private rx = 1.8;
  private ry = -2.2;
  private startRx = 1.8;
  private startRy = -2.2;
  private isDragging = false;
  private lastPointer = { x: 0, y: 0 };
  private misses = 0;
  private assisted = false;
  private complete = false;

  private gemGraphics?: Phaser.GameObjects.Graphics;
  private shadowGraphics?: Phaser.GameObjects.Graphics;
  private causticsGraphics?: Phaser.GameObjects.Graphics;
  private feedbackText?: Phaser.GameObjects.Text;
  private alignPercentText?: Phaser.GameObjects.Text;

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('GemAlignScene');
  }

  create(data: GemAlignData): void {
    this.gemData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'gemalign');
    this.complete = false;
    this.misses = 0;
    this.assisted = false;

    this.startRx = GEM_TARGET.rx + 1.42;
    this.startRy = GEM_TARGET.ry - 1.58;
    this.rx = this.startRx;
    this.ry = this.startRy;

    this.createBackground();
    this.createInputHandlers();
    this.drawShadow();
    this.drawGem();
  }

  update(_time: number, delta: number): void {
    if (this.complete) return;
    const dt = delta / 1000;

    if (this.keys) {
      let dx = 0;
      let dy = 0;
      if (this.keys.left.isDown || this.keys.a.isDown) dx -= 1;
      if (this.keys.right.isDown || this.keys.d.isDown) dx += 1;
      if (this.keys.up.isDown || this.keys.w.isDown) dy -= 1;
      if (this.keys.down.isDown || this.keys.s.isDown) dy += 1;

      if (dx !== 0 || dy !== 0) {
        const speed = this.assisted ? 1.45 : 1.85;
        this.ry += dx * dt * speed;
        this.rx += dy * dt * speed;
        this.drawGem();
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
        this.resetPosition();
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        this.tryAlign();
      }
    }
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x030914, 0.95);
    if (this.textures.exists('water-gem-art')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'water-gem-art')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.22);
    }

    this.add.text(GAME_WIDTH / 2, 38, 'PENYELARASAN PERMATA AIR 1999', {
      color: '#38bdf8', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
      stroke: '#082f49', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 70, 'Putar kristal 3D hingga refraksi cahaya menyatu dengan pola bayangan dasarnya.', {
      color: '#e0f2fe', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    this.causticsGraphics = this.add.graphics();
    this.shadowGraphics = this.add.graphics();
    this.gemGraphics = this.add.graphics();

    this.alignPercentText = this.add.text(GAME_WIDTH / 2, 380, 'KESELARASAN: 0%', {
      color: '#38bdf8', fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 425, 'GESER DENGAN MOUSE/SENTUH / PANAH + SPACE UNTUK MENYELARASKAN', {
      color: '#7dd3fc', fontFamily: 'Poppins, sans-serif', fontSize: '13px',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2 - 130, 478, 'RESET POSISI (R)', {
      backgroundColor: '#0369a1dd', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '12px', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.resetPosition());

    this.add.text(GAME_WIDTH / 2 + 130, 478, 'KUNCI KESELARASAN (SPACE)', {
      backgroundColor: '#0284c7dd', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '12px', padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.tryAlign());
  }

  private drawShadow(): void {
    if (!this.shadowGraphics) return;
    this.shadowGraphics.clear();

    const cx = GAME_WIDTH / 2;
    const cy = 236;
    const size = 115;

    this.shadowGraphics.fillStyle(0x06283d, 0.65);
    this.shadowGraphics.lineStyle(3, 0x0284c7, 0.85);

    const cosX = Math.cos(GEM_TARGET.rx);
    const cosY = Math.cos(GEM_TARGET.ry);

    const points: [number, number][] = [
      [0, -size * cosX],
      [size * cosY, 0],
      [0, size * cosX],
      [-size * cosY, 0],
    ];

    this.shadowGraphics.beginPath();
    points.forEach((pt, i) => {
      if (i === 0) this.shadowGraphics!.moveTo(cx + pt[0], cy + pt[1]);
      else this.shadowGraphics!.lineTo(cx + pt[0], cy + pt[1]);
    });
    this.shadowGraphics.closePath();
    this.shadowGraphics.fill();
    this.shadowGraphics.stroke();
  }

  private drawGem(): void {
    if (!this.gemGraphics) return;
    this.gemGraphics.clear();

    const cx = GAME_WIDTH / 2;
    const cy = 236;
    const size = 115;

    const cosX = Math.cos(this.rx);
    const cosY = Math.cos(this.ry);

    const dx = gemAngleDist(this.rx, GEM_TARGET.rx);
    const dy = gemAngleDist(this.ry, GEM_TARGET.ry);
    const totalDist = Math.hypot(dx, dy);
    const alignRatio = Math.max(0, 1 - totalDist / 2.8);

    this.alignPercentText?.setText(`KESELARASAN: ${Math.round(alignRatio * 100)}%`)
      .setColor(alignRatio > 0.85 ? '#86efac' : (alignRatio > 0.5 ? '#fde047' : '#38bdf8'));

    const points: [number, number][] = [
      [0, -size * cosX],
      [size * cosY, 0],
      [0, size * cosX],
      [-size * cosY, 0],
    ];

    // Crystal Facet Body
    this.gemGraphics.fillStyle(0x38bdf8, 0.75 + alignRatio * 0.2);
    this.gemGraphics.beginPath();
    points.forEach((pt, i) => {
      if (i === 0) this.gemGraphics!.moveTo(cx + pt[0], cy + pt[1]);
      else this.gemGraphics!.lineTo(cx + pt[0], cy + pt[1]);
    });
    this.gemGraphics.closePath();
    this.gemGraphics.fill();

    // Internal Refraction Lines
    this.gemGraphics.lineStyle(2, 0xe0f2fe, 0.95);
    this.gemGraphics.stroke();

    this.gemGraphics.lineStyle(1.5, 0xbae6fd, 0.75);
    this.gemGraphics.strokeLineShape(new Phaser.Geom.Line(cx + points[0][0], cy + points[0][1], cx + points[2][0], cy + points[2][1]));
    this.gemGraphics.strokeLineShape(new Phaser.Geom.Line(cx + points[1][0], cy + points[1][1], cx + points[3][0], cy + points[3][1]));
  }

  private resetPosition(): void {
    this.rx = this.startRx;
    this.ry = this.startRy;
    this.drawGem();
    this.soundManager?.playSelect();
    this.feedbackText?.setText('POSISI SUDUT PERMATA DIULANG').setColor('#7dd3fc');
  }

  private tryAlign(): void {
    if (this.complete) return;
    const dx = gemAngleDist(this.rx, GEM_TARGET.rx);
    const dy = gemAngleDist(this.ry, GEM_TARGET.ry);
    const win = this.assisted ? 1.5 : 2.75;

    if (dx < win && dy < win) {
      this.onFinish();
    } else {
      this.misses += 1;
      if (this.misses >= 3) this.assisted = true;
      this.soundManager?.playErrorBuzz();
      this.feedbackText?.setText(this.assisted ? 'PANTULAN BELUM COCOK — BANTUAN AKTIF' : 'PANTULAN BELUM MENYATU DENGAN BAYANGAN').setColor('#f87171');
      if (!this.registry.get('reduceMotion')) {
        this.cameras.main.shake(140, 0.005);
      }
    }
  }

  private onFinish(): void {
    this.complete = true;
    this.rx = GEM_TARGET.rx;
    this.ry = GEM_TARGET.ry;
    this.drawGem();

    this.gemData.run.gemAligned = true;
    this.gemData.run.inventory.water_gem = 1;
    this.gemData.save.saveCycle('1999', this.gemData.run);

    this.soundManager?.playWaterShimmer();
    this.soundManager?.playSuccessFanfare();
    this.feedbackText?.setText('BAYANGAN & PERMATA AIR SELARAS 100%! MASUK KE TAS.').setColor('#86efac');

    this.time.delayedCall(950, () => {
      this.scene.stop();
      this.gemData.onComplete();
    });
  }

  private createInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.complete) return;
      if (pointer.y > 110 && pointer.y < 370 && pointer.x > 220 && pointer.x < 740) {
        this.isDragging = true;
        this.lastPointer = { x: pointer.x, y: pointer.y };
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const dx = pointer.x - this.lastPointer.x;
        const dy = pointer.y - this.lastPointer.y;
        this.ry += dx * 0.012;
        this.rx += dy * 0.012;
        this.lastPointer = { x: pointer.x, y: pointer.y };
        this.drawGem();
      }
    });

    this.input.on('pointerup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.tryAlign();
      }
    });

    this.keys = this.input.keyboard?.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      r: Phaser.Input.Keyboard.KeyCodes.R,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }
}
