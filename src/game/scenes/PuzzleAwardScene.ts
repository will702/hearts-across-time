import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config';
import {
  buildRunRecap,
  deriveEndingProgress,
  ENDING_PIECES,
  type EndingProgress,
  type RunRecap,
} from '../minigames/endingProgress';
import type { EndingKey, RunState, SaveSystem } from '../systems/SaveSystem';
import { addPaperPanel } from '../ui/paper';
import { CSS, FONT, GOLD } from '../ui/theme';

export type PuzzleAwardData = {
  key: EndingKey;
  run: RunState;
};

const BOARD = { x: 270, y: 140, w: 420, h: 236 } as const;

export class PuzzleAwardScene extends Phaser.Scene {
  private awardData!: PuzzleAwardData;
  private soundManager?: SoundManager;
  private save!: SaveSystem;
  private progress!: EndingProgress;
  private recap!: RunRecap;
  private advancing = false;
  private continueText?: Phaser.GameObjects.Text;

  constructor() {
    super('PuzzleAwardScene');
  }

  create(data: PuzzleAwardData): void {
    this.awardData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.registry.set('nativeState', 'puzzleaward');
    this.advancing = false;

    this.soundManager?.playSuccessFanfare();

    this.progress = deriveEndingProgress(this.save.data.endings, data.key);
    this.recap = buildRunRecap(data.run, this.save.data.inspected);
    this.save.data.endings[data.key] = 1;
    this.save.save(this.save.data);

    this.renderAward();

    this.input.keyboard?.once('keydown-SPACE', () => this.advance());
    this.input.keyboard?.once('keydown-ENTER', () => this.advance());
    this.input.once('pointerup', () => this.advance());
  }

  snapshot(): Record<string, unknown> {
    return {
      award: {
        key: this.awardData.key,
        fresh: this.progress.fresh,
        total: this.progress.total,
        complete: this.progress.complete,
      },
      recap: this.recap,
    };
  }

  /** Layar penghargaan legacy: laboratorium 1999 redup, Elena & Arthur Tua
      mengapit panel kertas 600×414 berisi papan pecahan 3×2. */
  private renderAward(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x04070c, 1);
    if (this.textures.exists('lab-final')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'lab-final')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x04070c, 0.5);

    const warm = this.awardData.key === 'true';
    const frame = warm ? 24 : 8; // baris ekspresi sheet: warm / sad
    if (this.textures.exists('elena')) {
      this.add.sprite(108, GROUND_Y + 18, 'elena', frame)
        .setOrigin(0.5, 1).setScale(1.65);
    }
    if (this.textures.exists('arthur-tua')) {
      this.add.sprite(852, GROUND_Y + 18, 'arthur-tua', frame)
        .setOrigin(0.5, 1).setScale(1.65).setFlipX(true);
    }

    addPaperPanel(this, 180, 54, 600, 414, { radius: 10 });

    this.add.text(GAME_WIDTH / 2, 94, this.progress.fresh ? 'PECAHAN WAKTU DITEMUKAN' : 'PECAHAN INI SUDAH DIMILIKI', {
      color: this.progress.fresh ? CSS.red : '#6A5B4B',
      fontFamily: FONT.UI, fontSize: '24px', fontStyle: 'bold',
    }).setOrigin(0.5);

    const piece = ENDING_PIECES.find(entry => entry.key === this.awardData.key) ?? ENDING_PIECES[0];
    this.add.text(GAME_WIDTH / 2, 118, piece.title, {
      color: '#5A4A3C', fontFamily: FONT.META, fontSize: '12px',
    }).setOrigin(0.5);

    this.drawPuzzleBoard();

    this.add.text(
      GAME_WIDTH / 2,
      406,
      this.progress.complete
        ? 'PUZZLE LENGKAP — GAMEPLAY TERAKHIR TERBUKA'
        : `PECAHAN TERKUMPUL  ${this.progress.total} / 6`,
      {
        color: this.progress.complete ? CSS.green : CSS.body,
        fontFamily: FONT.UI, fontSize: '16px', fontStyle: 'bold',
      },
    ).setOrigin(0.5);

    this.continueText = this.add.text(GAME_WIDTH / 2, 442, 'Menyimpan pecahan timeline…', {
      color: '#6A5B4B', fontFamily: FONT.UI, fontSize: '14px',
    }).setOrigin(0.5);
    this.time.delayedCall(900, () => {
      this.continueText?.setText('ENTER / SENTUH UNTUK MELANJUTKAN');
      if (!this.registry.get('reduceMotion')) {
        this.tweens.add({
          targets: this.continueText,
          alpha: 0.45,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  private drawPuzzleBoard(): void {
    this.add.rectangle(
      BOARD.x + BOARD.w / 2,
      BOARD.y + BOARD.h / 2,
      BOARD.w + 20,
      BOARD.h + 20,
      0x161c24, 0.94,
    ).setStrokeStyle(2, GOLD, 0.6);

    if (this.progress.complete && this.textures.exists('bonus-city-complete')) {
      this.add.image(BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h / 2, 'bonus-city-complete')
        .setDisplaySize(BOARD.w, BOARD.h);
      this.add.rectangle(
        BOARD.x + BOARD.w / 2,
        BOARD.y + BOARD.h / 2,
        BOARD.w,
        BOARD.h,
        0x000000, 0,
      ).setStrokeStyle(2.5, 0xfff0a0, 1);
      return;
    }

    if (this.textures.exists('bonus-puzzle-board')) {
      this.add.image(BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h / 2, 'bonus-puzzle-board')
        .setDisplaySize(BOARD.w, BOARD.h)
        .setAlpha(0.2);
    }

    const gap = 4;
    const cellWidth = (BOARD.w - gap * 2) / 3;
    const cellHeight = (BOARD.h - gap) / 2;
    ENDING_PIECES.forEach((entry, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = BOARD.x + col * (cellWidth + gap);
      const y = BOARD.y + row * (cellHeight + gap);
      const unlocked = this.progress.unlocked[entry.key];
      const frame = unlocked ? this.ensureGridFrame('bonus-city-complete', index) : undefined;

      if (frame) {
        this.add.image(x + cellWidth / 2, y + cellHeight / 2, 'bonus-city-complete', frame)
          .setDisplaySize(cellWidth, cellHeight);
      } else {
        this.add.rectangle(x + cellWidth / 2, y + cellHeight / 2, cellWidth, cellHeight, 0x070a10, 0.88);
        this.add.text(x + cellWidth / 2, y + cellHeight / 2 + 10, '?', {
          color: 'rgba(245,240,232,.16)',
          fontFamily: FONT.TITLE, fontSize: '28px', fontStyle: 'bold',
        }).setOrigin(0.5);
      }

      const isAwarded = entry.key === this.awardData.key;
      if (isAwarded && this.progress.fresh) {
        const pulse = this.add.rectangle(x + cellWidth / 2, y + cellHeight / 2, cellWidth, cellHeight, 0xf7d984, 0.5);
        if (!this.registry.get('reduceMotion')) {
          this.tweens.add({
            targets: pulse,
            fillAlpha: 0.25,
            duration: 260,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      }

      this.add.rectangle(x + cellWidth / 2, y + cellHeight / 2, cellWidth, cellHeight, 0x000000, 0)
        .setStrokeStyle(unlocked ? 2 : 1, unlocked ? 0xffefb5 : 0xf5f0e8, unlocked ? 0.9 : 0.2);
    });
  }

  private ensureGridFrame(textureKey: string, index: number): string | undefined {
    if (!this.textures.exists(textureKey)) return undefined;
    const texture = this.textures.get(textureKey);
    const frameName = `hat-ending-grid-${index}`;
    if (!texture.has(frameName)) {
      const base = texture.get('__BASE');
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = Math.round(col * base.width / 3);
      const nextX = Math.round((col + 1) * base.width / 3);
      const y = Math.round(row * base.height / 2);
      const nextY = Math.round((row + 1) * base.height / 2);
      texture.add(frameName, 0, x, y, nextX - x, nextY - y);
    }
    return texture.has(frameName) ? frameName : undefined;
  }

  private advance(): void {
    if (this.advancing) return;
    this.advancing = true;
    this.soundManager?.playSelect();
    if (this.awardData.key === 'true') {
      this.scene.start('EndCardScene', { run: this.awardData.run });
    } else {
      this.scene.start('GlitchScene', { run: this.awardData.run });
    }
  }
}
