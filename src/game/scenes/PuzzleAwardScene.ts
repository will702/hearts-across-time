import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  buildRunRecap,
  deriveEndingProgress,
  ENDING_PIECES,
  type EndingProgress,
  type RunRecap,
} from '../minigames/endingProgress';
import type { EndingKey, RunState, SaveSystem } from '../systems/SaveSystem';

export type PuzzleAwardData = {
  key: EndingKey;
  run: RunState;
};

const BOARD = { x: 52, y: 126, w: 548, h: 304 } as const;
const RECAP = { x: 620, y: 126, w: 288, h: 304 } as const;

export class PuzzleAwardScene extends Phaser.Scene {
  private awardData!: PuzzleAwardData;
  private soundManager?: SoundManager;
  private save!: SaveSystem;
  private progress!: EndingProgress;
  private recap!: RunRecap;
  private advancing = false;

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

  private renderAward(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07040a, 1);
    if (this.textures.exists('bonus-puzzle-board')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bonus-puzzle-board')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setAlpha(0.07);
    }
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07040a, 0.42);

    this.add.text(GAME_WIDTH / 2, 31, 'KEPINGAN TAKDIR', {
      color: '#f6d57b',
      fontFamily: 'Cinzel, serif',
      fontSize: '25px',
      fontStyle: 'bold',
      stroke: '#2a1608',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(
      GAME_WIDTH / 2,
      65,
      this.progress.fresh ? 'PECAHAN WAKTU BARU DITEMUKAN' : 'PECAHAN INI SUDAH DIMILIKI',
      {
        color: this.progress.fresh ? '#fca5a5' : '#cbd5e1',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        letterSpacing: 2,
      },
    ).setOrigin(0.5);

    const piece = ENDING_PIECES.find(entry => entry.key === this.awardData.key) ?? ENDING_PIECES[0];
    this.add.text(GAME_WIDTH / 2, 91, `KEPING ${piece.index}/6 • ${piece.title}`, {
      color: '#fffaf0',
      fontFamily: 'Cinzel, serif',
      fontSize: '16px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 111, piece.detail, {
      color: '#d6c8b8',
      fontFamily: 'Patrick Hand, sans-serif',
      fontSize: '14px',
    }).setOrigin(0.5);

    this.drawPuzzleBoard();
    this.drawRecapPanel();

    this.add.text(
      GAME_WIDTH / 2,
      454,
      this.progress.complete
        ? 'PUZZLE 6/6 LENGKAP • KOTA 2088 DAN BONUS TERBUKA'
        : `PECAHAN TERKUMPUL ${this.progress.total} / 6`,
      {
        color: this.progress.complete ? '#bbf7d0' : '#fde68a',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        letterSpacing: 1,
      },
    ).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 502, 'LANJUTKAN (ENTER / SPACE)', {
      backgroundColor: '#94342edd',
      color: '#fff',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '14px',
      padding: { x: 28, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.advance());
  }

  private drawPuzzleBoard(): void {
    this.add.rectangle(
      BOARD.x + BOARD.w / 2,
      BOARD.y + BOARD.h / 2,
      BOARD.w + 18,
      BOARD.h + 18,
      0x111827,
      0.92,
    ).setStrokeStyle(2, 0xd6b260, 0.55);

    if (this.progress.complete && this.textures.exists('bonus-city-complete')) {
      this.add.image(BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h / 2, 'bonus-city-complete')
        .setDisplaySize(BOARD.w, BOARD.h);
      this.add.rectangle(
        BOARD.x + BOARD.w / 2,
        BOARD.y + BOARD.h - 20,
        214,
        28,
        0x111827,
        0.82,
      ).setStrokeStyle(1, 0xf6d57b, 0.7);
      this.add.text(BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h - 20, 'KOTA 2088 PULIH • 6/6', {
        color: '#fff0a0',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      return;
    }

    if (this.textures.exists('bonus-puzzle-board')) {
      this.add.image(BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h / 2, 'bonus-puzzle-board')
        .setDisplaySize(BOARD.w, BOARD.h)
        .setAlpha(0.18);
    }

    const gap = 5;
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
        this.add.rectangle(x + cellWidth / 2, y + cellHeight / 2, cellWidth, cellHeight, 0x070a10, 0.9);
        this.add.text(x + cellWidth / 2, y + cellHeight / 2 - 2, unlocked ? String(entry.index) : '?', {
          color: unlocked ? '#f6d57b' : '#64748b',
          fontFamily: 'Cinzel, serif',
          fontSize: '34px',
          fontStyle: 'bold',
        }).setOrigin(0.5);
      }

      const isAwarded = entry.key === this.awardData.key;
      if (isAwarded && this.progress.fresh) {
        this.add.rectangle(x + cellWidth / 2, y + cellHeight / 2, cellWidth, cellHeight, 0xf6d57b, 0.2);
        this.add.text(x + cellWidth / 2, y + 18, 'BARU', {
          color: '#201408',
          backgroundColor: '#f6d57be8',
          fontFamily: 'Poppins, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          padding: { x: 7, y: 3 },
        }).setOrigin(0.5);
      }

      this.add.rectangle(x + cellWidth / 2, y + cellHeight / 2, cellWidth, cellHeight, 0x000000, 0)
        .setStrokeStyle(unlocked ? 2 : 1, unlocked ? 0xffefb5 : 0x64748b, unlocked ? 0.9 : 0.45);
      this.add.text(x + 9, y + cellHeight - 8, String(entry.index), {
        color: unlocked ? '#fff8d6' : '#94a3b8',
        backgroundColor: '#090b10aa',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        padding: { x: 4, y: 2 },
      }).setOrigin(0, 1);
    });
  }

  private drawRecapPanel(): void {
    this.add.rectangle(
      RECAP.x + RECAP.w / 2,
      RECAP.y + RECAP.h / 2,
      RECAP.w,
      RECAP.h,
      0x120d14,
      0.9,
    ).setStrokeStyle(1, 0xd6b260, 0.42);

    this.add.text(RECAP.x + RECAP.w / 2, RECAP.y + 22, 'REKAP SIKLUS INI', {
      color: '#f6d57b',
      fontFamily: 'Cinzel, serif',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(RECAP.x + 18, RECAP.y + 49, `LOOP DITEMPUH  ${this.recap.loop}×`, {
      color: '#e2e8f0', fontFamily: 'Poppins, sans-serif', fontSize: '12px', fontStyle: 'bold',
    });

    const totalAffinity = Math.max(1, this.recap.empathy + this.recap.logic);
    this.drawAffinityBar('EMPATI', this.recap.empathy, totalAffinity, RECAP.y + 78, 0xa85550);
    this.drawAffinityBar('LOGIKA', this.recap.logic, totalAffinity, RECAP.y + 112, 0x556b7f);

    this.add.text(RECAP.x + RECAP.w / 2, RECAP.y + 153, this.recap.routes.join('  •  '), {
      color: '#dbe7d7',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(RECAP.x + 18, RECAP.y + 181, 'PENDEKATAN TANTANGAN', {
      color: '#a8a29e', fontFamily: 'Poppins, sans-serif', fontSize: '10px', fontStyle: 'bold',
    });
    const tagWidth = 78;
    this.recap.challenges.forEach((entry, index) => {
      const result = entry.result === 'empathy' ? 'EMPATI' : entry.result === 'logic' ? 'LOGIKA' : 'BELUM';
      const color = entry.result === 'empathy' ? 0x7e4a46 : entry.result === 'logic' ? 0x48596b : 0x3f3f46;
      const cx = RECAP.x + 18 + tagWidth / 2 + index * (tagWidth + 8);
      this.add.rectangle(cx, RECAP.y + 215, tagWidth, 38, color, 0.9).setStrokeStyle(1, 0xffffff, 0.18);
      this.add.text(cx, RECAP.y + 215, `${entry.era}\n${result}`, {
        color: '#fffaf0',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 2,
      }).setOrigin(0.5);
    });

    this.add.text(
      RECAP.x + RECAP.w / 2,
      RECAP.y + 263,
      `JEJAK KISAH  ${this.recap.loreFound} / ${this.recap.loreTotal}`,
      {
        color: this.recap.loreComplete ? '#f6d57b' : '#cbd5e1',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
      },
    ).setOrigin(0.5);
    this.add.text(
      RECAP.x + RECAP.w / 2,
      RECAP.y + 286,
      this.recap.loreComplete ? 'KISAH ARTHUR LENGKAP' : 'Jejak yang belum ditemukan tetap tersimpan.',
      {
        color: this.recap.loreComplete ? '#fde68a' : '#8f9baa',
        fontFamily: 'Patrick Hand, sans-serif',
        fontSize: '11px',
        fontStyle: this.recap.loreComplete ? 'bold' : 'normal',
      },
    ).setOrigin(0.5);
  }

  private drawAffinityBar(label: string, value: number, total: number, y: number, color: number): void {
    const x = RECAP.x + 18;
    const width = RECAP.w - 36;
    this.add.text(x, y, `${label}  ${value}`, {
      color: '#e7e5e4', fontFamily: 'Poppins, sans-serif', fontSize: '10px', fontStyle: 'bold',
    });
    this.add.rectangle(x + width / 2, y + 20, width, 10, 0x334155, 0.55).setStrokeStyle(1, 0xffffff, 0.12);
    const fillWidth = value > 0 ? Math.max(6, width * value / total) : 0;
    if (fillWidth > 0) this.add.rectangle(x + fillWidth / 2, y + 20, fillWidth, 10, color, 0.95);
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
