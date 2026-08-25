import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

const INTRO_PAGES = [
  {
    title: 'SEBELUM WAKTU DIBUKA',
    lead: 'Tahun 2088 di ambang kepunahan. Setiap pilihanmu dapat mengubah takdir dan alur cerita ke depannya.',
    rows: [
      ['WAKTU', 'Jelajahi tahun 1944, 1968, dan 1999 untuk menulis ulang nasib Arthur.'],
      ['PENAWAR', 'Racik formula sebelum Virus Crimson melenyapkan masa depan.'],
      ['SIKLUS', 'Jika garis waktu runtuh, perjalanan berulang—namun ingatanmu tetap ada.'],
    ],
  },
  {
    title: 'CARA MELANGKAH',
    lead: 'Setiap era menyimpan jalan, petunjuk, dan bahaya berbeda.',
    rows: [
      ['GERAK', 'Gunakan ← → atau A D. Tahan SHIFT untuk berlari.'],
      ['PERIKSA', 'Tekan ↓, S, ENTER, atau SPACE di dekat benda.'],
      ['DIALOG', 'Lanjutkan dengan ENTER, SPACE, klik, atau sentuhan.'],
    ],
  },
  {
    title: 'YANG ARTHUR INGAT',
    lead: 'Game tidak akan mengatakan pilihan mana yang “benar”.',
    rows: [
      ['PILIHAN', 'Gunakan ↑ ↓ lalu ENTER, atau tekan nomor opsi yang tersedia.'],
      ['KARAKTER', 'Ucapan dan caramu menyelesaikan tantangan diam-diam mengubah Arthur.'],
      ['JEJAK', 'Baca buku harian dan temukan jejak cerita untuk mengungkap akhir sejati.'],
    ],
  },
] as const;

export class PrologueScene extends Phaser.Scene {
  private save!: SaveSystem;
  private run!: RunState;
  private page = 0;
  private pageContainer?: Phaser.GameObjects.Container;
  private bgImage?: Phaser.GameObjects.Image;
  private started = false;
  private temporalPulse?: Phaser.GameObjects.Container;

  constructor() {
    super('PrologueScene');
  }

  create(): void {
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.registry.set('nativeState', 'prologue');
    this.run = this.save.beginCycle();
    this.page = 0;
    this.started = false;

    const soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    soundManager?.setAmbience('2088');

    // Dark canvas background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050407, 1);

    if (this.textures.exists('bgnarator')) {
      this.bgImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bgnarator')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.48);

      if (!this.registry.get('reduceMotion')) {
        this.tweens.add({
          targets: this.bgImage,
          scaleX: this.bgImage.scaleX * 1.025,
          scaleY: this.bgImage.scaleY * 1.025,
          x: GAME_WIDTH / 2 + 6,
          duration: 7000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
      }
    }

    // Vignette dark gradient overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x030509, 0.78);

    this.showPage();
    this.input.keyboard?.on('keydown-LEFT', () => this.movePage(-1));
    this.input.keyboard?.on('keydown-UP', () => this.movePage(-1));
    this.input.keyboard?.on('keydown-A', () => this.movePage(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.movePage(1));
    this.input.keyboard?.on('keydown-DOWN', () => this.movePage(1));
    this.input.keyboard?.on('keydown-D', () => this.movePage(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.movePage(1));
    this.input.keyboard?.on('keydown-SPACE', () => this.movePage(1));
    this.input.keyboard?.on('keydown-ESC', () => this.startDialogue());
  }

  snapshot(): Record<string, unknown> {
    return {
      prologuePage: this.page,
      prologueStarted: this.started,
    };
  }

  private showPage(): void {
    this.pageContainer?.destroy();
    const page = INTRO_PAGES[this.page];
    const objects: Phaser.GameObjects.GameObject[] = [];

    // Paper card background (sketch paper color #f3eada)
    const cardShadow = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 4, 740, 424, 0x000000, 0.35);
    const cardBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 736, 420, 0xf3eada, 0.99)
      .setStrokeStyle(3, 0x6a4930);

    // Hand-drawn sketch border pass (secondary inner ink line)
    const innerBorder = this.add.graphics();
    innerBorder.lineStyle(1, 0x2b211a, 0.38);
    innerBorder.strokeRoundedRect(115, 63, 730, 414, 8);

    // Title: MISI / TUTORIAL
    const titleText = this.add.text(GAME_WIDTH / 2, 108, page.title, {
      color: '#94342e',
      fontFamily: 'Cinzel, Patrick Hand, serif',
      fontSize: '24px',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    // Decorative underline curve under title
    const lineGfx = this.add.graphics();
    lineGfx.lineStyle(1.5, 0x94342e, 0.45);
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(175, 137),
      new Phaser.Math.Vector2(GAME_WIDTH / 2, 132),
      new Phaser.Math.Vector2(785, 137),
    );
    curve.draw(lineGfx, 32);

    // Lead text
    const leadText = this.add.text(GAME_WIDTH / 2, 163, page.lead, {
      color: '#2b211a',
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      fontStyle: 'italic',
      align: 'center',
      wordWrap: { width: 650, useAdvancedWrap: true },
    }).setOrigin(0.5);

    objects.push(cardShadow, cardBg, innerBorder, titleText, lineGfx, leadText);

    // 3 Content Rows
    page.rows.forEach(([icon, text], index) => {
      const y = 208 + index * 63;
      const rowRule = this.add.rectangle(174, y + 25, 2, 39, 0x94342e, 0.6);

      const iconText = this.add.text(205, y + 26, icon, {
        color: '#94342e',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        align: 'center',
        fixedWidth: 70,
      }).setOrigin(0.5);

      const rowText = this.add.text(240, y + 26, text, {
        color: '#2b211a',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '14.5px',
        wordWrap: { width: 535, useAdvancedWrap: true },
      }).setOrigin(0, 0.5);

      objects.push(rowRule, iconText, rowText);
    });

    // Pagination: HALAMAN X / 3
    const pageNum = this.add.text(GAME_WIDTH / 2, 411, `CATATAN ${this.page + 1} / ${INTRO_PAGES.length}`, {
      color: '#94342e',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      letterSpacing: 1.2,
    }).setOrigin(0.5);
    objects.push(pageNum);

    // Back Button (x: 180, w: 210, center: 285, y: 445)
    const isBackActive = this.page > 0;
    const backBtnBg = this.add.rectangle(285, 445, 210, 38, isBackActive ? 0x94342e : 0x5a4a3c, isBackActive ? 1 : 0.1)
      .setStrokeStyle(1.5, isBackActive ? 0x6d211d : 0x2b211a, isBackActive ? 1 : 0.38)
      .setInteractive({ useHandCursor: isBackActive });
    const backBtnText = this.add.text(285, 445, 'KEMBALI', {
      color: isBackActive ? '#fff8ea' : '#4f4236',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    if (isBackActive) {
      backBtnBg.on('pointerup', () => this.movePage(-1));
      backBtnBg.on('pointerover', () => backBtnBg.setFillStyle(0xa83e38));
      backBtnBg.on('pointerout', () => backBtnBg.setFillStyle(0x94342e));
    }
    objects.push(backBtnBg, backBtnText);

    // Next / Start Button (x: 570, w: 220, center: 680, y: 445)
    const isLastPage = this.page === INTRO_PAGES.length - 1;
    const nextBtnBg = this.add.rectangle(680, 445, 220, 38, 0x94342e, 1)
      .setStrokeStyle(1.5, 0x6d211d, 1)
      .setInteractive({ useHandCursor: true });
    const nextBtnText = this.add.text(680, 445, isLastPage ? 'MULAI PERJALANAN' : 'LANJUT', {
      color: '#fff8ea',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    nextBtnBg.on('pointerup', () => this.movePage(1));
    nextBtnBg.on('pointerover', () => nextBtnBg.setFillStyle(0xa83e38));
    nextBtnBg.on('pointerout', () => nextBtnBg.setFillStyle(0x94342e));
    objects.push(nextBtnBg, nextBtnText);

    // Top-Right Skip Button (LEWATI × at 812, 108)
    const skipBtn = this.add.text(812, 108, 'LEWATI  ×', {
      color: '#94342e',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    skipBtn.on('pointerup', () => this.startDialogue());
    skipBtn.on('pointerover', () => skipBtn.setColor('#c85855'));
    skipBtn.on('pointerout', () => skipBtn.setColor('#94342e'));
    objects.push(skipBtn);

    // Bottom Navigation Hints
    const isTouch = this.sys.game.device.input.touch || new URLSearchParams(location.search).get('touch') === '1';
    const hintText = this.add.text(
      GAME_WIDTH / 2,
      500,
      isTouch ? 'ketuk tombol untuk melanjutkan' : '← → ganti halaman  •  ENTER lanjut  •  ESC lewati',
      {
        color: '#6a5b4b',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '12px',
      },
    ).setOrigin(0.5);
    objects.push(hintText);

    this.pageContainer = this.add.container(0, 0, objects);

    if (!this.registry.get('reduceMotion')) {
      this.pageContainer.setAlpha(0.7);
      this.pageContainer.setScale(0.98);
      this.tweens.add({
        targets: this.pageContainer,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 180,
        ease: 'Sine.easeOut',
      });
    }
  }

  private movePage(direction: number): void {
    if (this.started) return;
    const next = Phaser.Math.Clamp(this.page + direction, 0, INTRO_PAGES.length - 1);
    if (next === this.page) {
      if (direction > 0 && this.page === INTRO_PAGES.length - 1) this.startDialogue();
      return;
    }
    this.page = next;
    (this.registry.get('soundManager') as SoundManager | undefined)?.playSelect();
    this.showPage();
  }

  private startDialogue(): void {
    if (this.started) return;
    this.started = true;
    this.pageContainer?.destroy();

    const soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    soundManager?.playConfirm();
    soundManager?.playWaterShimmer();

    // A quiet temporal scan replaces the old red heartbeat vignette.
    if (!this.registry.get('reduceMotion')) {
      const outer = this.add.ellipse(0, 0, 760, 330).setStrokeStyle(2, 0x67e8f9, 0.45);
      const middle = this.add.ellipse(0, 0, 540, 230).setStrokeStyle(2, 0xf7d984, 0.38);
      const core = this.add.circle(0, 0, 7, 0xe0f2fe, 0.75);
      this.temporalPulse = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [outer, middle, core])
        .setDepth(10)
        .setAlpha(0.12);
      this.tweens.add({
        targets: this.temporalPulse,
        alpha: 0.48,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 1300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.scene.launch('DialogueScene', {
      nodeId: 'prologue',
      run: this.run,
      onComplete: (action?: { type: string; to?: string }) => {
        this.temporalPulse?.destroy();
        if (action?.type === 'vortex' || action?.to === '1944') {
          this.scene.start('VortexScene', { to: '1944', run: this.run });
        } else {
          this.scene.start('Era1944Scene', { run: this.run, intro: true });
        }
      },
    });
  }
}
