import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { buildRunRecap, deriveEndingProgress, type EndingProgress, type RunRecap } from '../minigames/endingProgress';
import { LORE_COMPLETION_TEXT } from '../narrative/lore';
import { defaultRun, type RunState, type SaveSystem } from '../systems/SaveSystem';

export type EndCardData = {
  run?: RunState;
};

const STORY_PANEL = { x: 38, y: 110, w: 424, h: 252 } as const;
const RECAP_PANEL = { x: 484, y: 110, w: 438, h: 252 } as const;

export class EndCardScene extends Phaser.Scene {
  private save!: SaveSystem;
  private soundManager?: SoundManager;
  private recap!: RunRecap;
  private endingProgress!: EndingProgress;

  constructor() {
    super('EndCardScene');
  }

  create(data: EndCardData = {}): void {
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'endcard');

    const run = data.run ?? this.save.data.game?.S ?? defaultRun();
    this.recap = buildRunRecap(run, this.save.data.inspected);
    this.endingProgress = deriveEndingProgress(this.save.data.endings, 'true');

    this.save.data.endings.true = 1;
    this.save.clearCycle();

    this.soundManager?.setSong('end');
    this.soundManager?.playSuccessFanfare();

    this.renderBackground();
    this.renderStoryPanel();
    this.renderRecapPanel();
    this.renderFooter();

    this.input.keyboard?.once('keydown-SPACE', () => this.goToTitle());
    this.input.keyboard?.once('keydown-ENTER', () => this.goToTitle());
  }

  snapshot(): Record<string, unknown> {
    return {
      ending: true,
      endingProgress: {
        total: this.endingProgress.total,
        complete: this.endingProgress.complete,
      },
      recap: this.recap,
    };
  }

  private renderBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090408, 1);
    if (this.textures.exists('bonus-city-complete')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bonus-city-complete')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setAlpha(0.72);
    }
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090408, 0.52);
    this.add.rectangle(GAME_WIDTH / 2, 40, GAME_WIDTH, 94, 0x090408, 0.62);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 49, GAME_WIDTH, 98, 0x090408, 0.62);

    this.add.text(GAME_WIDTH / 2, 29, 'HEARTS ACROSS TIME', {
      color: '#f6d57b',
      fontFamily: 'Cinzel, serif',
      fontSize: '29px',
      fontStyle: 'bold',
      stroke: '#280c0c',
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 63, 'BREAK THE LOOP • TRUE ENDING', {
      color: '#fffbf0',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '13px',
      letterSpacing: 4,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(
      GAME_WIDTH / 2,
      90,
      this.endingProgress.complete
        ? 'PUZZLE WAKTU 6/6 • KOTA 2088 PULIH'
        : 'PUZZLE WAKTU ' + this.endingProgress.total + '/6 • AKHIR SEJATI TERCATAT',
      {
      color: '#1b1a16',
      backgroundColor: '#f6d57be8',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      padding: { x: 13, y: 4 },
      },
    ).setOrigin(0.5);
  }

  private renderStoryPanel(): void {
    this.add.rectangle(
      STORY_PANEL.x + STORY_PANEL.w / 2,
      STORY_PANEL.y + STORY_PANEL.h / 2,
      STORY_PANEL.w,
      STORY_PANEL.h,
      0x140d12,
      0.86,
    ).setStrokeStyle(1, 0xd6b260, 0.4);

    this.add.text(STORY_PANEL.x + STORY_PANEL.w / 2, STORY_PANEL.y + 25, 'AKHIR SEJATI', {
      color: '#f6d57b',
      fontFamily: 'Cinzel, serif',
      fontSize: '16px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(
      STORY_PANEL.x + STORY_PANEL.w / 2,
      STORY_PANEL.y + 116,
      'Elena melompat kembali ke tahun 2088.\nVial antibodi murni disuntikkan ke tubuh Arthur.\nDetak jantungnya kembali berdegup stabil.\nLingkaran kutukan waktu telah resmi terputus.',
      {
        color: '#fef3c7',
        fontFamily: 'Patrick Hand, sans-serif',
        fontSize: '18px',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: STORY_PANEL.w - 44, useAdvancedWrap: true },
      },
    ).setOrigin(0.5);

    this.add.text(STORY_PANEL.x + STORY_PANEL.w / 2, STORY_PANEL.y + 218, 'KOTA YANG UTUH MENJADI SAKSI TIMELINE BARU', {
      color: '#bbf7d0',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      letterSpacing: 1,
      align: 'center',
      wordWrap: { width: STORY_PANEL.w - 38, useAdvancedWrap: true },
    }).setOrigin(0.5);
  }

  private renderRecapPanel(): void {
    this.add.rectangle(
      RECAP_PANEL.x + RECAP_PANEL.w / 2,
      RECAP_PANEL.y + RECAP_PANEL.h / 2,
      RECAP_PANEL.w,
      RECAP_PANEL.h,
      0x11141a,
      0.87,
    ).setStrokeStyle(1, 0xd6b260, 0.4);

    this.add.text(RECAP_PANEL.x + RECAP_PANEL.w / 2, RECAP_PANEL.y + 23, 'JEJAK SIKLUS TERAKHIR', {
      color: '#f6d57b',
      fontFamily: 'Cinzel, serif',
      fontSize: '15px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(RECAP_PANEL.x + 20, RECAP_PANEL.y + 47, 'LOOP DITEMPUH  ' + this.recap.loop + '×', {
      color: '#e7e5e4', fontFamily: 'Poppins, sans-serif', fontSize: '11px', fontStyle: 'bold',
    });

    const affinityTotal = Math.max(1, this.recap.empathy + this.recap.logic);
    this.drawAffinityBar('EMPATI', this.recap.empathy, affinityTotal, RECAP_PANEL.y + 68, 0xa85550);
    this.drawAffinityBar('LOGIKA', this.recap.logic, affinityTotal, RECAP_PANEL.y + 99, 0x556b7f);

    this.add.text(RECAP_PANEL.x + RECAP_PANEL.w / 2, RECAP_PANEL.y + 139, this.recap.routes.join('  •  '), {
      color: '#dbe7d7',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const tagWidth = 116;
    this.recap.challenges.forEach((entry, index) => {
      const result = entry.result === 'empathy' ? 'EMPATI' : entry.result === 'logic' ? 'LOGIKA' : 'BELUM';
      const color = entry.result === 'empathy' ? 0x7e4a46 : entry.result === 'logic' ? 0x48596b : 0x3f3f46;
      const cx = RECAP_PANEL.x + 24 + tagWidth / 2 + index * (tagWidth + 11);
      this.add.rectangle(cx, RECAP_PANEL.y + 172, tagWidth, 34, color, 0.9)
        .setStrokeStyle(1, 0xffffff, 0.18);
      this.add.text(cx, RECAP_PANEL.y + 172, entry.era + ' • ' + result, {
        color: '#fffaf0',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    });

    const loreText = this.recap.loreComplete
      ? LORE_COMPLETION_TEXT
      : 'Jejak kisah ditemukan: ' + this.recap.loreFound + '/' + this.recap.loreTotal + '.';
    this.add.text(RECAP_PANEL.x + RECAP_PANEL.w / 2, RECAP_PANEL.y + 221, loreText, {
      color: this.recap.loreComplete ? '#fde68a' : '#cbd5e1',
      fontFamily: this.recap.loreComplete ? 'Cinzel, serif' : 'Patrick Hand, sans-serif',
      fontSize: this.recap.loreComplete ? '10px' : '12px',
      fontStyle: this.recap.loreComplete ? 'italic' : 'normal',
      align: 'center',
      lineSpacing: 3,
      wordWrap: { width: RECAP_PANEL.w - 40, useAdvancedWrap: true },
    }).setOrigin(0.5);
  }

  private renderFooter(): void {
    this.add.rectangle(GAME_WIDTH / 2, 407, 850, 66, 0x160d14, 0.84)
      .setStrokeStyle(1, 0xd6b260, 0.42);
    this.add.text(
      GAME_WIDTH / 2,
      407,
      '“Dan suatu hari nanti... kita akan bertemu lagi sebagai dua orang biasa yang saling jatuh cinta.”',
      {
        color: '#fbcfe8',
        fontFamily: 'Cinzel, serif',
        fontSize: '14px',
        fontStyle: 'italic',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: 770, useAdvancedWrap: true },
      },
    ).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 492, 'KEMBALI KE MENU UTAMA (ENTER / SPACE)', {
      backgroundColor: '#94342ecc',
      color: '#fff',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '14px',
      padding: { x: 28, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.goToTitle());
  }

  private drawAffinityBar(label: string, value: number, total: number, y: number, color: number): void {
    const x = RECAP_PANEL.x + 20;
    const width = RECAP_PANEL.w - 40;
    this.add.text(x, y, label + '  ' + value, {
      color: '#e7e5e4', fontFamily: 'Poppins, sans-serif', fontSize: '9px', fontStyle: 'bold',
    });
    this.add.rectangle(x + width / 2, y + 17, width, 9, 0x334155, 0.58).setStrokeStyle(1, 0xffffff, 0.12);
    const fillWidth = value > 0 ? Math.max(6, width * value / total) : 0;
    if (fillWidth > 0) this.add.rectangle(x + fillWidth / 2, y + 17, fillWidth, 9, color, 0.95);
  }

  private goToTitle(): void {
    this.soundManager?.playSelect();
    this.scene.start('TitleScene');
  }
}
