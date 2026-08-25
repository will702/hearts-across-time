import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { closestPolylineProgress, pointInPolygon } from '../minigames/math';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

export type PhotoPuzzleData = {
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

const PHOTO_TARGET = { x: 270, y: 110, w: 420, h: 280 };

const PHOTO_SEAMS: [number, number][][] = [
  [[210, 0], [205, 18], [214, 34], [202, 52], [216, 70], [207, 88], [219, 107], [204, 126], [212, 140]],
  [[0, 140], [24, 136], [45, 146], [68, 137], [91, 147], [115, 135], [139, 145], [164, 137], [187, 148], [212, 140], [235, 147], [258, 136], [282, 146], [305, 137], [330, 149], [353, 139], [378, 147], [399, 136], [420, 140]],
  [[212, 140], [204, 160], [217, 180], [205, 201], [218, 222], [207, 242], [215, 261], [210, 280]],
];

const PHOTO_PIECES_DEF: { poly: [number, number][]; home: [number, number] }[] = [
  {
    poly: [[0, 0], [210, 0], [205, 18], [214, 34], [202, 52], [216, 70], [207, 88], [219, 107], [204, 126], [212, 140], [187, 148], [164, 137], [139, 145], [115, 135], [91, 147], [68, 137], [45, 146], [24, 136], [0, 140]],
    home: [-210, 0],
  },
  {
    poly: [[210, 0], [420, 0], [420, 140], [399, 136], [378, 147], [353, 139], [330, 149], [305, 137], [282, 146], [258, 136], [235, 147], [212, 140], [204, 126], [219, 107], [207, 88], [216, 70], [202, 52], [214, 34], [205, 18]],
    home: [210, 0],
  },
  {
    poly: [[0, 140], [24, 136], [45, 146], [68, 137], [91, 147], [115, 135], [139, 145], [164, 137], [187, 148], [212, 140], [204, 160], [217, 180], [205, 201], [218, 222], [207, 242], [215, 261], [210, 280], [0, 280]],
    home: [-210, 20],
  },
  {
    poly: [[212, 140], [235, 147], [258, 136], [282, 146], [305, 137], [330, 149], [353, 139], [378, 147], [399, 136], [420, 140], [420, 280], [210, 280], [215, 261], [207, 242], [218, 222], [205, 201], [217, 180], [204, 160]],
    home: [210, 20],
  },
];

export class PhotoPuzzleScene extends Phaser.Scene {
  private puzzleData!: PhotoPuzzleData;
  private soundManager?: SoundManager;
  private stage: 'assemble' | 'glue' | 'success' = 'assemble';
  private pieces: Piece[] = [];
  private selectedPiece = 0;
  private draggingIndex = -1;
  private dragOffset = { x: 0, y: 0 };
  private glueLines = [false, false, false];
  private glueTrace = [0, 0, 0];
  private glueSel = 0;

  private feedbackText?: Phaser.GameObjects.Text;
  private seamGraphics?: Phaser.GameObjects.Graphics;
  private photoImage?: Phaser.GameObjects.Image;

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('PhotoPuzzleScene');
  }

  create(data: PhotoPuzzleData): void {
    this.puzzleData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'photopuzzle');
    this.stage = 'assemble';
    this.selectedPiece = 0;
    this.draggingIndex = -1;
    this.glueLines = [false, false, false];
    this.glueTrace = [0, 0, 0];
    this.glueSel = 0;

    this.createBackground();
    this.initPieces();
    this.createInputHandlers();
    this.refreshAllPieces();
  }

  update(_time: number, delta: number): void {
    if (this.stage === 'success') return;
    const dt = delta / 1000;

    if (this.stage === 'assemble' && this.keys) {
      for (let i = 0; i < 4; i++) {
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
        p.ox += dx * dt * 185;
        p.oy += dy * dt * 185;
        this.refreshPiece(this.selectedPiece);
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        this.trySnap(this.selectedPiece);
      }
    } else if (this.stage === 'glue' && this.keys) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.up)) {
        this.glueSel = (this.glueSel + 2) % 3;
        this.soundManager?.playSelect();
        this.drawSeams();
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.down)) {
        this.glueSel = (this.glueSel + 1) % 3;
        this.soundManager?.playSelect();
        this.drawSeams();
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        this.glueCurrentLine();
      }
    }
  }

  snapshot(): Record<string, unknown> {
    return {
      minigame: 'photo',
      stage: this.stage,
      target: PHOTO_TARGET,
      pieces: this.pieces.map(piece => ({ poly: piece.poly, ox: piece.ox, oy: piece.oy, placed: piece.placed })),
      selectedPiece: this.selectedPiece,
      glueLines: [...this.glueLines],
      glueTrace: [...this.glueTrace],
      glueSelected: this.glueSel,
    };
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x04060a, 0.9);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 836, 482, 0xf3eada, 0.98)
      .setStrokeStyle(3, 0x6a4930);

    this.add.text(GAME_WIDTH / 2, 58, 'KENANGAN YANG TEROBEK', {
      color: '#94342e', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 88, '1999 • SUSUN EMPAT BAGIAN FOTO ELENA DAN ARTHUR', {
      color: '#5a4a3c', fontFamily: 'Poppins, sans-serif', fontSize: '12px', letterSpacing: 1,
    }).setOrigin(0.5);

    this.add.rectangle(
      PHOTO_TARGET.x + PHOTO_TARGET.w / 2,
      PHOTO_TARGET.y + PHOTO_TARGET.h / 2,
      PHOTO_TARGET.w + 14,
      PHOTO_TARGET.h + 14,
      0xe5d6bf,
      0.55,
    ).setStrokeStyle(2, 0x6a4930, 0.5);

    if (this.textures.exists('elena-arthur-photo')) {
      this.photoImage = this.add.image(
        PHOTO_TARGET.x + PHOTO_TARGET.w / 2,
        PHOTO_TARGET.y + PHOTO_TARGET.h / 2,
        'elena-arthur-photo',
      ).setDisplaySize(PHOTO_TARGET.w, PHOTO_TARGET.h).setAlpha(0.18);
    }

    this.seamGraphics = this.add.graphics().setDepth(6);

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 425, 'RAPIKAN EMPAT ROBEKAN FOTO (ANGKA 1-4 & ARAH + SPACE)', {
      color: '#2b211a', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 478, 'PERIKSA ROBEKAN / REKATKAN GARIS (SPACE / ENTER)', {
      backgroundColor: '#94342edd', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '13px', padding: { x: 20, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      if (this.stage === 'assemble') {
        for (let i = 0; i < 4; i++) this.trySnap(i);
      } else if (this.stage === 'glue') {
        this.glueCurrentLine();
      }
    });
  }

  private initPieces(): void {
    this.pieces = PHOTO_PIECES_DEF.map((def, index) => {
      const g = this.add.graphics().setDepth(4);
      const fragmentTexture = this.ensurePhotoPieceTexture(index, def.poly);
      const image = fragmentTexture
        ? this.add.image(PHOTO_TARGET.x, PHOTO_TARGET.y, fragmentTexture).setOrigin(0).setDepth(3)
        : undefined;
      const label = this.add.text(0, 0, String(index + 1), {
        color: '#fff7ed', backgroundColor: '#5a2a24cc', fontFamily: 'Poppins, sans-serif',
        fontSize: '11px', fontStyle: 'bold', padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(5);
      return {
        poly: def.poly,
        ox: def.home[0],
        oy: def.home[1],
        homeX: def.home[0],
        homeY: def.home[1],
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
    const isSelected = idx === this.selectedPiece && this.stage === 'assemble';
    const posX = PHOTO_TARGET.x + p.ox;
    const posY = PHOTO_TARGET.y + p.oy;

    if (p.image) {
      p.image
        .setPosition(PHOTO_TARGET.x + p.ox, PHOTO_TARGET.y + p.oy)
        .setAlpha(p.placed ? 1 : (isSelected ? 0.98 : 0.82));
    }
    if (p.label) {
      p.label
        .setPosition(posX + p.poly[0][0] + 14, posY + p.poly[0][1] + 18)
        .setVisible(!p.placed);
    }

    p.graphics.fillStyle(
      p.image ? (isSelected ? 0xffffff : 0xd4a373) : (p.placed ? 0xd4a373 : (isSelected ? 0xe9d8a6 : 0xbb9457)),
      p.image ? (isSelected ? 0.09 : 0.035) : (p.placed ? 0.92 : 0.78),
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

    p.graphics.lineStyle(2, p.placed ? 0x6a4930 : (isSelected ? 0xffffff : 0x432818), 0.95);
    p.graphics.stroke();
  }

  private refreshAllPieces(): void {
    this.pieces.forEach((_, idx) => this.refreshPiece(idx));
  }

  private trySnap(idx: number): void {
    const p = this.pieces[idx];
    if (!p || p.placed) return;

    const dist = Math.hypot(p.ox, p.oy);
    if (dist < 48) {
      p.ox = 0;
      p.oy = 0;
      p.placed = true;
      this.refreshPiece(idx);
      this.soundManager?.playPaperSlide();
      this.emitPieceSparks(idx);

      const placedCount = this.pieces.filter(q => q.placed).length;
      this.feedbackText?.setText(`ROBEKAN ${placedCount} / 4 TERPASANG`).setColor('#86efac');

      if (this.pieces.every(q => q.placed)) {
        this.startGlueStage();
      }
    } else {
      p.ox = p.homeX;
      p.oy = p.homeY;
      this.refreshPiece(idx);
      this.soundManager?.playErrorBuzz();
      this.feedbackText?.setText('TEPI FOTO BELUM COCOK').setColor('#fca5a5');
    }
  }

  private emitPieceSparks(idx: number): void {
    if (this.registry.get('reduceMotion')) return;
    const p = this.pieces[idx];
    if (!p) return;
    const cx = PHOTO_TARGET.x + (p.poly[0][0] + p.poly[1][0]) / 2;
    const cy = PHOTO_TARGET.y + (p.poly[0][1] + p.poly[1][1]) / 2;

    for (let i = 0; i < 10; i++) {
      const spark = this.add.circle(cx, cy, Phaser.Math.Between(2, 3), 0xfde047);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(30, 90);
      this.tweens.add({
        targets: spark,
        x: cx + Math.cos(angle) * speed,
        y: cy + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 380,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private startGlueStage(): void {
    this.stage = 'glue';
    this.refreshAllPieces();
    if (this.photoImage) this.photoImage.setAlpha(0.65);
    this.soundManager?.playConfirm();
    this.feedbackText?.setText('FOTO TERSUSUN — PILIH & REKATKAN TIGA GARIS EMAS KINTSUGI (SPACE / ENTER)').setColor('#f6d57b');
    this.drawSeams();
  }

  private drawSeams(): void {
    if (!this.seamGraphics) return;
    this.seamGraphics.clear();

    PHOTO_SEAMS.forEach((seam, idx) => {
      const isGlued = this.glueLines[idx];
      const isSel = idx === this.glueSel;

      this.seamGraphics!.lineStyle(
        isGlued ? 5 : (isSel ? 5 : 3),
        isGlued ? 0xc89b4a : (isSel ? 0x94342e : 0x2b211a),
        0.95,
      );
      this.seamGraphics!.beginPath();
      seam.forEach(([x, y], pointIndex) => {
        const px = PHOTO_TARGET.x + x;
        const py = PHOTO_TARGET.y + y;
        if (pointIndex === 0) this.seamGraphics!.moveTo(px, py);
        else this.seamGraphics!.lineTo(px, py);
      });
      this.seamGraphics!.strokePath();
    });
  }

  private glueCurrentLine(): void {
    if (this.stage !== 'glue') return;
    this.glueLines[this.glueSel] = true;
    this.soundManager?.playGlassClink();
    this.drawSeams();

    const gluedCount = this.glueLines.filter(Boolean).length;
    this.feedbackText?.setText(`GARIS EMAS ${gluedCount} / 3 TEREKAT SEMPURNA`).setColor('#86efac');

    if (this.glueLines.every(Boolean)) {
      this.onFinish();
    } else {
      this.glueSel = this.glueLines.findIndex(v => !v);
      this.drawSeams();
    }
  }

  private onFinish(): void {
    this.stage = 'success';
    if (this.photoImage) this.photoImage.setAlpha(1.0);

    this.puzzleData.run.photoRepaired = true;
    this.puzzleData.run.inventory.arthur_photo = 1;
    this.puzzleData.save.saveCycle('1999', this.puzzleData.run);

    this.soundManager?.playSuccessFanfare();
    this.feedbackText?.setText('FOTO ELENA & ARTHUR UTUH KEMBALI! MASUK KE TAS.').setColor('#a3e635');

    this.time.delayedCall(1800, () => {
      this.scene.stop();
      this.puzzleData.onComplete();
    });
  }

  private createInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.stage === 'assemble') {
        for (let i = this.pieces.length - 1; i >= 0; i--) {
          const p = this.pieces[i];
          if (p.placed) continue;
          const lx = pointer.x - (PHOTO_TARGET.x + p.ox);
          const ly = pointer.y - (PHOTO_TARGET.y + p.oy);
          if (pointInPolygon(p.poly, lx, ly)) {
            this.draggingIndex = i;
            this.selectedPiece = i;
            this.dragOffset = { x: pointer.x - p.ox, y: pointer.y - p.oy };
            this.soundManager?.playSelect();
            this.refreshAllPieces();
            break;
          }
        }
      } else if (this.stage === 'glue') {
        this.traceGlueAt(pointer.x, pointer.y);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.stage === 'assemble' && this.draggingIndex >= 0) {
        const p = this.pieces[this.draggingIndex];
        p.ox = pointer.x - this.dragOffset.x;
        p.oy = pointer.y - this.dragOffset.y;
        this.refreshPiece(this.draggingIndex);
      } else if (this.stage === 'glue' && pointer.isDown) {
        this.traceGlueAt(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', () => {
      if (this.stage === 'assemble' && this.draggingIndex >= 0) {
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
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private traceGlueAt(x: number, y: number): void {
    let hit = -1;
    let best = { distance: Infinity, progress: 0 };
    PHOTO_SEAMS.forEach((seam, index) => {
      if (this.glueLines[index]) return;
      const candidate = closestPolylineProgress(seam, x - PHOTO_TARGET.x, y - PHOTO_TARGET.y);
      if (candidate.distance < best.distance) {
        hit = index;
        best = candidate;
      }
    });
    if (hit < 0 || best.distance > 28) return;

    const bit = 1 << Phaser.Math.Clamp(Math.floor(best.progress * 10), 0, 9);
    this.glueTrace[hit] |= bit;
    this.glueSel = hit;
    const covered = this.glueTrace[hit].toString(2).replaceAll('0', '').length;
    this.feedbackText?.setText(`GARIS ${hit + 1} DILEM ${covered * 10}%`).setColor('#f6d57b');
    this.drawSeams();
    if (covered >= 6) this.glueCurrentLine();
  }

  private ensurePhotoPieceTexture(index: number, poly: [number, number][]): string | undefined {
    if (!this.textures.exists('elena-arthur-photo')) return undefined;
    const key = `photo-fragment-${index}`;
    if (this.textures.exists(key)) return key;

    const sourceFrame = this.textures.getFrame('elena-arthur-photo');
    if (!sourceFrame) return undefined;
    const texture = this.textures.createCanvas(key, PHOTO_TARGET.w, PHOTO_TARGET.h);
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
      PHOTO_TARGET.w,
      PHOTO_TARGET.h,
    );
    context.restore();
    texture.refresh();
    return key;
  }
}
