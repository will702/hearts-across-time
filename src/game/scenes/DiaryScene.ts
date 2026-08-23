import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { DiaryData, NarrativeState } from '../narrative/storyScript';
import { getArthurDiary } from '../narrative/storyScript';

export type DiarySceneData = {
  run: NarrativeState;
  onComplete: () => void;
};

export class DiaryScene extends Phaser.Scene {
  private diaryData!: DiarySceneData;
  private diaryInfo!: DiaryData;
  private currentPage = 0;

  private pageText?: Phaser.GameObjects.Text;
  private headerText?: Phaser.GameObjects.Text;
  private pageIndicator?: Phaser.GameObjects.Text;

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('DiaryScene');
  }

  create(data: DiarySceneData): void {
    this.diaryData = data;
    this.diaryInfo = getArthurDiary(data.run);
    this.registry.set('nativeState', 'diary');
    this.currentPage = 0;

    this.createUI();
    this.createInputHandlers();
    this.showPage(0);
  }

  update(): void {
    if (!this.keys) return;

    if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d) || Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      this.nextPage();
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a)) {
      this.prevPage();
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.close();
    }
  }

  private createUI(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050403, 0.85);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 700, 420, 0xfaf3e8, 0.98)
      .setStrokeStyle(3, 0x6a4930)
      .setInteractive();

    this.headerText = this.add.text(GAME_WIDTH / 2, 95, this.diaryInfo.meta, {
      color: '#6a4930', fontFamily: 'Cinzel, serif', fontSize: '15px', fontStyle: 'bold',
    }).setOrigin(0.5);

    if (this.diaryInfo.nostalgia) {
      this.add.text(GAME_WIDTH / 2, 120, '— Terasa sedikit nostalgia —', {
        color: '#94342e', fontFamily: 'Patrick Hand, sans-serif', fontSize: '15px', fontStyle: 'italic',
      }).setOrigin(0.5);
    }

    this.pageText = this.add.text(GAME_WIDTH / 2, 235, '', {
      color: '#2a1f18', fontFamily: 'Patrick Hand, sans-serif', fontSize: '21px', wordWrap: { width: 620 }, align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);

    this.pageIndicator = this.add.text(GAME_WIDTH / 2, 385, '', {
      color: '#8c684d', fontFamily: 'Poppins, sans-serif', fontSize: '13px',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2 - 200, 435, '◀ SEBELUMNYA', {
      backgroundColor: '#6a4930', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '12px', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive().on('pointerup', () => this.prevPage());

    this.add.text(GAME_WIDTH / 2 + 200, 435, 'SELANJUTNYA ▶', {
      backgroundColor: '#94342e', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '12px', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive().on('pointerup', () => this.nextPage());

    this.add.text(GAME_WIDTH / 2, 435, 'TUTUP CATATAN', {
      backgroundColor: '#2b1d13', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '12px', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setInteractive().on('pointerup', () => this.close());
  }

  private showPage(page: number): void {
    this.currentPage = page;
    const content = this.diaryInfo.pages[page] ?? '';
    this.pageText?.setText(content);
    this.pageIndicator?.setText(`Halaman ${page + 1} / ${this.diaryInfo.pages.length}`);
  }

  private nextPage(): void {
    if (this.currentPage < this.diaryInfo.pages.length - 1) {
      this.showPage(this.currentPage + 1);
    } else {
      this.close();
    }
  }

  private prevPage(): void {
    if (this.currentPage > 0) {
      this.showPage(this.currentPage - 1);
    }
  }

  private close(): void {
    this.scene.stop();
    this.diaryData.onComplete();
  }

  private createInputHandlers(): void {
    this.keys = this.input.keyboard?.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }
}
