import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
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
};

const PHOTO_TARGET = { x: 270, y: 118, w: 420, h: 280 };

const PHOTO_PIECES_DEF: { poly: [number, number][]; home: [number, number] }[] = [
  {
    poly: [[0, 0], [210, 0], [205, 18], [214, 34], [202, 52], [216, 70], [207, 88], [219, 107], [204, 126], [212, 140], [187, 148], [164, 137], [139, 145], [115, 135], [91, 147], [68, 137], [45, 146], [24, 136], [0, 140]],
    home: [-210, 30],
  },
  {
    poly: [[210, 0], [420, 0], [420, 140], [399, 136], [378, 147], [353, 139], [330, 149], [305, 137], [282, 146], [258, 136], [235, 147], [212, 140], [204, 126], [219, 107], [207, 88], [216, 70], [202, 52], [214, 34], [205, 18]],
    home: [210, 30],
  },
  {
    poly: [[0, 140], [24, 136], [45, 146], [68, 137], [91, 147], [115, 135], [139, 145], [164, 137], [187, 148], [212, 140], [204, 160], [217, 180], [205, 201], [218, 222], [207, 242], [215, 261], [210, 280], [0, 280]],
    home: [-210, 0],
  },
  {
    poly: [[212, 140], [235, 147], [258, 136], [282, 146], [305, 137], [330, 149], [353, 139], [378, 147], [399, 136], [420, 140], [420, 280], [210, 280], [215, 261], [207, 242], [218, 222], [205, 201], [217, 180], [204, 160]],
    home: [210, 0],
  },
];

export class PhotoPuzzleScene extends Phaser.Scene {
  private puzzleData!: PhotoPuzzleData;
  private stage: 'assemble' | 'glue' | 'success' = 'assemble';
  private pieces: Piece[] = [];
  private selectedPiece = 0;
  private draggingIndex = -1;
  private dragOffset = { x: 0, y: 0 };
  private glueLines = [false, false, false];
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
    this.registry.set('nativeState', 'photopuzzle');
    this.stage = 'assemble';
    this.selectedPiece = 0;
    this.draggingIndex = -1;
    this.glueLines = [false, false, false];
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
        p.ox += dx * dt * 175;
        p.oy += dy * dt * 175;
        this.refreshPiece(this.selectedPiece);
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        this.trySnap(this.selectedPiece);
      }
    } else if (this.stage === 'glue' && this.keys) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.up)) {
        this.glueSel = (this.glueSel + 2) % 3;
        this.drawSeams();
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.down)) {
        this.glueSel = (this.glueSel + 1) % 3;
        this.drawSeams();
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        this.glueCurrentLine();
      }
    }
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0807, 0.95);

    this.add.text(GAME_WIDTH / 2, 42, 'REKATKAN FOTO ELENA & ARTHUR', {
      color: '#f6d57b', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.rectangle(
      PHOTO_TARGET.x + PHOTO_TARGET.w / 2,
      PHOTO_TARGET.y + PHOTO_TARGET.h / 2,
      PHOTO_TARGET.w + 14,
      PHOTO_TARGET.h + 14,
      0x1c1612,
      0.9,
    ).setStrokeStyle(2, 0xd4a373);

    if (this.textures.exists('elena-arthur-photo')) {
      this.photoImage = this.add.image(
        PHOTO_TARGET.x + PHOTO_TARGET.w / 2,
        PHOTO_TARGET.y + PHOTO_TARGET.h / 2,
        'elena-arthur-photo',
      ).setDisplaySize(PHOTO_TARGET.w, PHOTO_TARGET.h).setAlpha(0.15);
    }

    this.seamGraphics = this.add.graphics();

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 430, 'RAPIKAN EMPAT ROBEKAN FOTO (ANGKA 1-4 & ARAH + SPACE)', {
      color: '#faedcd', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 480, 'PERIKSA ROBEKAN / REKATKAN GARIS', {
      backgroundColor: '#94342edd', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '13px', padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setInteractive().on('pointerup', () => {
      if (this.stage === 'assemble') {
        for (let i = 0; i < 4; i++) this.trySnap(i);
      } else if (this.stage === 'glue') {
        this.glueCurrentLine();
      }
    });
  }

  private initPieces(): void {
    this.pieces = PHOTO_PIECES_DEF.map((def) => {
      const g = this.add.graphics();
      return {
        poly: def.poly,
        ox: def.home[0],
        oy: def.home[1],
        homeX: def.home[0],
        homeY: def.home[1],
        placed: false,
        graphics: g,
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

    p.graphics.fillStyle(p.placed ? 0xd4a373 : (isSelected ? 0xe9d8a6 : 0xbb9457), p.placed ? 0.9 : 0.75);
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
    if (dist < 46) {
      p.ox = 0;
      p.oy = 0;
      p.placed = true;
      this.refreshPiece(idx);

      const placedCount = this.pieces.filter(q => q.placed).length;
      this.feedbackText?.setText(`ROBEKAN ${placedCount} / 4 TERPASANG`).setColor('#86efac');

      if (this.pieces.every(q => q.placed)) {
        this.startGlueStage();
      }
    } else {
      p.ox = p.homeX;
      p.oy = p.homeY;
      this.refreshPiece(idx);
      this.feedbackText?.setText('TEPI FOTO BELUM COCOK').setColor('#fca5a5');
    }
  }

  private startGlueStage(): void {
    this.stage = 'glue';
    this.refreshAllPieces();
    if (this.photoImage) this.photoImage.setAlpha(0.65);
    this.feedbackText?.setText('FOTO TERSUSUN — PILIH & REKATKAN TIGA GARIS ROBEKAN (SPACE / ENTER)').setColor('#f6d57b');
    this.drawSeams();
  }

  private drawSeams(): void {
    if (!this.seamGraphics) return;
    this.seamGraphics.clear();

    const midX = PHOTO_TARGET.x + 210;
    const midY = PHOTO_TARGET.y + 140;

    const seams = [
      { x1: midX, y1: PHOTO_TARGET.y, x2: midX, y2: midY },
      { x1: PHOTO_TARGET.x, y1: midY, x2: PHOTO_TARGET.x + PHOTO_TARGET.w, y2: midY },
      { x1: midX, y1: midY, x2: midX, y2: PHOTO_TARGET.y + PHOTO_TARGET.h },
    ];

    seams.forEach((s, idx) => {
      const isGlued = this.glueLines[idx];
      const isSel = idx === this.glueSel;

      this.seamGraphics!.lineStyle(
        isGlued ? 4 : (isSel ? 5 : 3),
        isGlued ? 0x22c55e : (isSel ? 0x60a5fa : 0xf87171),
        0.9,
      );
      this.seamGraphics!.strokeLineShape(new Phaser.Geom.Line(s.x1, s.y1, s.x2, s.y2));
    });
  }

  private glueCurrentLine(): void {
    if (this.stage !== 'glue') return;
    this.glueLines[this.glueSel] = true;
    this.drawSeams();

    const gluedCount = this.glueLines.filter(Boolean).length;
    this.feedbackText?.setText(`GARIS ${gluedCount} / 3 TEREKAT`).setColor('#86efac');

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

    this.feedbackText?.setText('FOTO ELENA & ARTHUR UTUH KEMBALI! MASUK KE TAS.').setColor('#a3e635');

    this.time.delayedCall(800, () => {
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
          if (this.pointInPoly(p.poly, lx, ly)) {
            this.draggingIndex = i;
            this.selectedPiece = i;
            this.dragOffset = { x: pointer.x - p.ox, y: pointer.y - p.oy };
            this.refreshAllPieces();
            break;
          }
        }
      } else if (this.stage === 'glue') {
        this.glueCurrentLine();
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.stage === 'assemble' && this.draggingIndex >= 0) {
        const p = this.pieces[this.draggingIndex];
        p.ox = pointer.x - this.dragOffset.x;
        p.oy = pointer.y - this.dragOffset.y;
        this.refreshPiece(this.draggingIndex);
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

  private pointInPoly(poly: [number, number][], x: number, y: number): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0];
      const yi = poly[i][1];
      const xj = poly[j][0];
      const yj = poly[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
