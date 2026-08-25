import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { pointInPolygon } from '../minigames/math';
import {
  randomRoseHomes,
  ROSE_PIECES_DEF,
  ROSE_SOURCE_CROP,
  ROSE_SOURCE_FRAME,
  ROSE_TARGET,
} from '../minigames/roseLayout';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

export type RosePuzzleData = {
  run: RunState;
  save: SaveSystem;
  onComplete: () => void;
};

type Piece = {
  poly: [number, number][];
  ox: number;
  oy: number;
  homeX: number;
  homeY: number;
  placed: boolean;
  graphics?: Phaser.GameObjects.Graphics;
  image?: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
};

export class RosePuzzleScene extends Phaser.Scene {
  private puzzleData!: RosePuzzleData;
  private soundManager?: SoundManager;
  private pieces: Piece[] = [];
  private selectedPiece = 0;
  private draggingIndex = -1;
  private dragOffset = { x: 0, y: 0 };
  private feedbackText?: Phaser.GameObjects.Text;
  private complete = false;
  private roseFrame?: string;

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('RosePuzzleScene');
  }

  create(data: RosePuzzleData): void {
    this.puzzleData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'rosepuzzle');
    this.complete = false;
    this.draggingIndex = -1;
    this.roseFrame = this.ensureRoseSourceFrame();

    this.createBackground();
    this.initPieces();
    this.createInputHandlers();
    this.refreshAllPieces();
  }

  update(_time: number, delta: number): void {
    if (this.complete) return;
    const dt = delta / 1000;

    if (this.keys) {
      for (let i = 0; i < this.pieces.length; i++) {
        const key = this.keys[`key${i + 1}`];
        if (key && Phaser.Input.Keyboard.JustDown(key)) {
          this.selectedPiece = i;
          this.soundManager?.playSelect();
          this.refreshAllPieces();
        }
      }

      let dx = 0;
      let dy = 0;
      if (this.keys.left.isDown || this.keys.a.isDown) dx -= 1;
      if (this.keys.right.isDown || this.keys.d.isDown) dx += 1;
      if (this.keys.up.isDown || this.keys.w.isDown) dy -= 1;
      if (this.keys.down.isDown || this.keys.s.isDown) dy += 1;

      const p = this.pieces[this.selectedPiece];
      if (p && !p.placed && (dx !== 0 || dy !== 0)) {
        p.ox += dx * dt * 180;
        p.oy += dy * dt * 180;
        this.refreshPiece(this.selectedPiece);
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        this.trySnap(this.selectedPiece);
      }
    }
  }

  snapshot(): Record<string, unknown> {
    return {
      minigame: 'rose',
      target: ROSE_TARGET,
      pieces: this.pieces.map(piece => ({ poly: piece.poly, ox: piece.ox, oy: piece.oy, placed: piece.placed })),
      selectedPiece: this.selectedPiece,
      complete: this.complete,
    };
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0c0807, 0.95);
    if (this.roseFrame) {
      this.add.image(
        ROSE_TARGET.x + ROSE_TARGET.w / 2,
        ROSE_TARGET.y + ROSE_TARGET.h / 2,
        'rose-bottle-broken',
        this.roseFrame,
      ).setDisplaySize(ROSE_TARGET.w, ROSE_TARGET.h).setAlpha(0.14).setDepth(1);
    }

    this.add.text(GAME_WIDTH / 2, 38, 'SUSUN KEMBALI BOTOL MAWAR ABADI', {
      color: '#f87171', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
      stroke: '#280c0c', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.rectangle(
      ROSE_TARGET.x + ROSE_TARGET.w / 2,
      ROSE_TARGET.y + ROSE_TARGET.h / 2,
      ROSE_TARGET.w + 14,
      ROSE_TARGET.h + 14,
      0x180f0c,
      0.85,
    ).setDepth(0);

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 425, 'PILIH PECAHAN (1-8) & GESER KE POSISI BOTOL (SPACE UNTUK KUNCI)', {
      color: '#cbd5e1', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 478, 'PASANG PECAHAN TERPILIH (SPACE / ENTER)', {
      backgroundColor: '#94342edd', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '13px', padding: { x: 20, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      this.trySnap(this.selectedPiece);
    });
  }

  private initPieces(): void {
    const homes = randomRoseHomes();
    this.pieces = ROSE_PIECES_DEF.map((def, index) => {
      const g = this.add.graphics().setDepth(4);
      const fragmentTexture = this.roseFrame ? this.ensureRosePieceTexture(index, def.poly) : undefined;
      const image = fragmentTexture
        ? this.add.image(
          ROSE_TARGET.x,
          ROSE_TARGET.y,
          fragmentTexture,
        ).setOrigin(0).setDepth(3)
        : undefined;
      const label = this.add.text(0, 0, String(index + 1), {
        color: '#fff7ed',
        backgroundColor: '#3f1d1dcc',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(5);
      return {
        poly: def.poly.map(([x, y]) => [x, y] as [number, number]),
        ox: homes[index][0],
        oy: homes[index][1],
        homeX: homes[index][0],
        homeY: homes[index][1],
        placed: false,
        graphics: g,
        image,
        label,
      };
    });
  }

  private refreshPiece(idx: number): void {
    const p = this.pieces[idx];
    if (!p || !p.graphics) return;

    p.graphics.clear();
    const isSelected = idx === this.selectedPiece;
    const posX = ROSE_TARGET.x + p.ox;
    const posY = ROSE_TARGET.y + p.oy;

    if (p.image) {
      p.image
        .setPosition(ROSE_TARGET.x + p.ox, ROSE_TARGET.y + p.oy)
        .setAlpha(p.placed ? 1 : (isSelected ? 0.98 : 0.84));
    }

    if (p.label) {
      const minX = Math.min(...p.poly.map(([x]) => x));
      const minY = Math.min(...p.poly.map(([, y]) => y));
      p.label
        .setPosition(posX + minX + 15, posY + minY + 15)
        .setVisible(!p.placed)
        .setAlpha(isSelected ? 1 : 0.78);
    }

    p.graphics.fillStyle(
      p.image ? (isSelected ? 0xffffff : 0xfda4af) : (p.placed ? 0x22c55e : (isSelected ? 0xf87171 : 0xef4444)),
      p.image ? (isSelected ? 0.1 : 0.04) : (p.placed ? 0.85 : 0.7),
    );
    p.graphics.beginPath();
    p.poly.forEach((pt, i) => {
      const x = posX + pt[0];
      const y = posY + pt[1];
      if (i === 0) p.graphics!.moveTo(x, y);
      else p.graphics!.lineTo(x, y);
    });
    p.graphics.closePath();
    p.graphics.fill();

    p.graphics.lineStyle(2, p.placed ? 0x86efac : (isSelected ? 0xffffff : 0xfca5a5), 0.95);
    p.graphics.stroke();
  }

  private refreshAllPieces(): void {
    this.pieces.forEach((_, idx) => this.refreshPiece(idx));
  }

  private trySnap(idx: number): void {
    const p = this.pieces[idx];
    if (!p || p.placed) return;

    const dist = Math.hypot(p.ox, p.oy);
    if (dist < 46) {
      p.ox = 0;
      p.oy = 0;
      p.placed = true;
      this.refreshPiece(idx);
      this.soundManager?.playGlassClink();
      this.emitPieceSparks(idx);

      const placedCount = this.pieces.filter(q => q.placed).length;
      this.feedbackText?.setText(`KEPINGAN ${placedCount} / ${this.pieces.length} TERPASANG`).setColor('#86efac');

      if (this.pieces.every(q => q.placed)) {
        this.onFinish();
      }
    } else {
      p.ox = p.homeX;
      p.oy = p.homeY;
      this.refreshPiece(idx);
      this.soundManager?.playErrorBuzz();
      this.feedbackText?.setText('TEPINYA BELUM MENYATU DENGAN PAS').setColor('#fca5a5');
    }
  }

  private emitPieceSparks(idx: number): void {
    if (this.registry.get('reduceMotion')) return;
    const p = this.pieces[idx];
    if (!p) return;
    const cx = ROSE_TARGET.x + (p.poly[0][0] + p.poly[1][0]) / 2;
    const cy = ROSE_TARGET.y + (p.poly[0][1] + p.poly[1][1]) / 2;

    for (let i = 0; i < 12; i++) {
      const spark = this.add.circle(cx, cy, Phaser.Math.Between(2, 4), 0xfca5a5);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(35, 100);
      this.tweens.add({
        targets: spark,
        x: cx + Math.cos(angle) * speed,
        y: cy + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 400,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private onFinish(): void {
    this.complete = true;
    this.puzzleData.run.roseRepaired = true;
    this.puzzleData.run.inventory.flower = 1;
    this.puzzleData.save.saveCycle('1968', this.puzzleData.run);

    this.soundManager?.playSuccessFanfare();
    this.feedbackText?.setText('BOTOL MAWAR ABADI BERHASIL DISUSUN! MASUK KE TAS.').setColor('#a3e635');

    this.time.delayedCall(950, () => {
      this.scene.stop();
      this.puzzleData.onComplete();
    });
  }

  private createInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.complete) return;
      for (let i = this.pieces.length - 1; i >= 0; i--) {
        const p = this.pieces[i];
        if (p.placed) continue;
        const lx = pointer.x - (ROSE_TARGET.x + p.ox);
        const ly = pointer.y - (ROSE_TARGET.y + p.oy);
        if (pointInPolygon(p.poly, lx, ly)) {
          this.draggingIndex = i;
          this.selectedPiece = i;
          this.dragOffset = { x: pointer.x - p.ox, y: pointer.y - p.oy };
          this.soundManager?.playSelect();
          this.refreshAllPieces();
          break;
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.draggingIndex >= 0) {
        const p = this.pieces[this.draggingIndex];
        p.ox = pointer.x - this.dragOffset.x;
        p.oy = pointer.y - this.dragOffset.y;
        this.refreshPiece(this.draggingIndex);
      }
    });

    this.input.on('pointerup', () => {
      if (this.draggingIndex >= 0) {
        const idx = this.draggingIndex;
        this.draggingIndex = -1;
        this.trySnap(idx);
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
      key1: Phaser.Input.Keyboard.KeyCodes.ONE,
      key2: Phaser.Input.Keyboard.KeyCodes.TWO,
      key3: Phaser.Input.Keyboard.KeyCodes.THREE,
      key4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      key5: Phaser.Input.Keyboard.KeyCodes.FIVE,
      key6: Phaser.Input.Keyboard.KeyCodes.SIX,
      key7: Phaser.Input.Keyboard.KeyCodes.SEVEN,
      key8: Phaser.Input.Keyboard.KeyCodes.EIGHT,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private ensureRoseSourceFrame(): string | undefined {
    if (!this.textures.exists('rose-bottle-broken')) return undefined;
    const texture = this.textures.get('rose-bottle-broken');
    if (!texture.has(ROSE_SOURCE_FRAME)) {
      const base = texture.get('__BASE');
      const cropRight = ROSE_SOURCE_CROP.x + ROSE_SOURCE_CROP.w;
      const cropBottom = ROSE_SOURCE_CROP.y + ROSE_SOURCE_CROP.h;
      if (cropRight <= base.width && cropBottom <= base.height) {
        texture.add(
          ROSE_SOURCE_FRAME,
          0,
          ROSE_SOURCE_CROP.x,
          ROSE_SOURCE_CROP.y,
          ROSE_SOURCE_CROP.w,
          ROSE_SOURCE_CROP.h,
        );
      }
    }
    return texture.has(ROSE_SOURCE_FRAME) ? ROSE_SOURCE_FRAME : undefined;
  }

  private ensureRosePieceTexture(index: number, poly: [number, number][]): string | undefined {
    const key = `rose-fragment-${index}`;
    if (this.textures.exists(key)) return key;

    const sourceFrame = this.textures.getFrame('rose-bottle-broken', ROSE_SOURCE_FRAME);
    if (!sourceFrame) return undefined;
    const texture = this.textures.createCanvas(key, ROSE_TARGET.w, ROSE_TARGET.h);
    if (!texture) return undefined;

    const context = texture.context;
    context.save();
    context.beginPath();
    poly.forEach(([x, y], pointIndex) => {
      if (pointIndex === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.clip();
    context.drawImage(
      sourceFrame.source.image as CanvasImageSource,
      sourceFrame.cutX,
      sourceFrame.cutY,
      sourceFrame.cutWidth,
      sourceFrame.cutHeight,
      0,
      0,
      ROSE_TARGET.w,
      ROSE_TARGET.h,
    );
    context.restore();
    texture.refresh();
    return key;
  }

}
