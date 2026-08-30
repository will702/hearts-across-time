import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { CharacterId, Expression } from '../narrative/storyScript';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

const INTRO_PAGES = [
  {
    title: 'MISI: PUTUSKAN LINGKARAN WAKTU',
    lead: 'Tahun 2088 di ambang kepunahan. Setiap pilihanmu dapat mengubah takdir dan alur cerita ke depannya.',
    rows: [
      ['WAKTU', 'Jelajahi tahun 1944, 1968, dan 1999 untuk menulis ulang nasib Arthur.'],
      ['PENAWAR', 'Racik formula penawar sebelum Virus Crimson melenyapkan masa depan.'],
      ['SIKLUS', 'Jika garis waktu runtuh, siklus akan berulang—namun ingatan dan pengetahuanmu tetap abadi.'],
    ],
  },
  {
    title: 'BERGERAK MELINTASI WAKTU',
    lead: 'Setiap era menyimpan jalan, petunjuk, dan bahaya berbeda.',
    rows: [
      ['← →', 'Bergerak dengan ← → atau A D. Tahan SHIFT untuk berlari.'],
      ['PERIKSA', 'Tekan ↓, S, atau ENTER untuk benda; SPACE juga membuka buku harian.'],
      ['ENTER', 'Lanjutkan dialog dengan ENTER, SPACE, klik, atau sentuhan.'],
    ],
  },
  {
    title: 'PILIHANMU MEMBENTUK ARTHUR',
    lead: 'Game tidak akan mengatakan pilihan mana yang “benar”.',
    rows: [
      ['1 / 2 / 3', 'Pilih dengan ↑ ↓ lalu ENTER, atau tekan nomor opsi yang tersedia.'],
      ['HATI / NALAR', 'Ucapan dan cara menyelesaikan tantangan diam-diam mengubah Arthur.'],
      ['AKHIR', 'Baca buku harian, temukan jejak cerita, dan ungkap akhir sejati.'],
    ],
  },
] as const;

export class PrologueScene extends Phaser.Scene {
  private save!: SaveSystem;
  private run!: RunState;
  private page = 0;
  private pageContainer?: Phaser.GameObjects.Container;
  private bgImage?: Phaser.GameObjects.Image;
  private elenaImage?: Phaser.GameObjects.Image;
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

    // Title (legacy: bold 25px Patrick Hand merah tinta)
    const titleText = this.add.text(GAME_WIDTH / 2, 108, page.title, {
      color: '#94342e',
      fontFamily: 'Patrick Hand, sans-serif',
      fontSize: '25px',
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

    // Lead text (legacy: Georgia italic)
    const leadText = this.add.text(GAME_WIDTH / 2, 163, page.lead, {
      color: '#2b211a',
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      fontStyle: 'italic',
      align: 'center',
      wordWrap: { width: 650, useAdvancedWrap: true },
    }).setOrigin(0.5);

    objects.push(cardShadow, cardBg, innerBorder, titleText, lineGfx, leadText);

    // 3 baris konten (legacy: wash + ikon #55677A + teks Patrick Hand 15)
    page.rows.forEach(([icon, text], index) => {
      const y = 208 + index * 63;
      const wash = this.add.graphics();
      wash.fillStyle(0x5a4a3c, 0.055);
      wash.fillRoundedRect(165, y, 630, 51, 7);
      wash.lineStyle(1, 0x2b211a, 0.24);
      wash.strokeRoundedRect(165, y, 630, 51, 7);

      const iconText = this.add.text(205, y + 31, icon, {
        color: '#55677a',
        fontFamily: 'Patrick Hand, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        align: 'center',
        fixedWidth: 80,
      }).setOrigin(0.5);

      const rowText = this.add.text(240, y + 23, text, {
        color: '#2b211a',
        fontFamily: 'Patrick Hand, sans-serif',
        fontSize: '15px',
        wordWrap: { width: 535, useAdvancedWrap: true },
      }).setOrigin(0, 0);

      objects.push(wash, iconText, rowText);
    });

    // Pagination: HALAMAN X / 3 (copy legacy)
    const pageNum = this.add.text(GAME_WIDTH / 2, 411, `HALAMAN ${this.page + 1} / ${INTRO_PAGES.length}`, {
      color: '#94342e',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      letterSpacing: 1.2,
    }).setOrigin(0.5);
    objects.push(pageNum);

    // Back Button (legacy: 180, 426, 210×38, ‹ KEMBALI)
    const isBackActive = this.page > 0;
    const backBtnBg = this.add.rectangle(285, 445, 210, 38, isBackActive ? 0x94342e : 0x5a4a3c, isBackActive ? 1 : 0.1)
      .setStrokeStyle(1.5, isBackActive ? 0x6d211d : 0x2b211a, isBackActive ? 1 : 0.38)
      .setInteractive({ useHandCursor: isBackActive });
    const backBtnText = this.add.text(285, 445, '‹ KEMBALI', {
      color: isBackActive ? '#fff8ea' : '#4f4236',
      fontFamily: 'Patrick Hand, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    if (isBackActive) {
      backBtnBg.on('pointerup', () => this.movePage(-1));
      backBtnBg.on('pointerover', () => backBtnBg.setFillStyle(0xa83e38));
      backBtnBg.on('pointerout', () => backBtnBg.setFillStyle(0x94342e));
    }
    objects.push(backBtnBg, backBtnText);

    // Next / Start Button (legacy: 570, 426, 220×38, LANJUT › / MULAI PERJALANAN ›)
    const isLastPage = this.page === INTRO_PAGES.length - 1;
    const nextBtnBg = this.add.rectangle(680, 445, 220, 38, 0x94342e, 1)
      .setStrokeStyle(1.5, 0x6d211d, 1)
      .setInteractive({ useHandCursor: true });
    const nextBtnText = this.add.text(680, 445, isLastPage ? 'MULAI PERJALANAN ›' : 'LANJUT ›', {
      color: '#fff8ea',
      fontFamily: 'Patrick Hand, sans-serif',
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

    this.stagePrologueScene();

    this.scene.launch('DialogueScene', {
      nodeId: 'prologue',
      run: this.run,
      setSpeakerExpression: (_who: CharacterId, expr: Expression) => this.setElenaExpression(expr),
      // Narator pada prolog adalah suara batin Elena. Hubungkan visualnya supaya
      // bounce saat mengetik ikut berjalan seperti dialog sinematik era lain.
      speakerVisual: (who: CharacterId) => (who === 'narrator' || who === 'elena') ? this.elenaImage ?? null : null,
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

  private setElenaExpression(expr: string): void {
    if (!this.elenaImage) return;
    const targetKey = (expr === 'sad' || expr === 'shock') && this.textures.exists('elena-dialog-sad')
      ? 'elena-dialog-sad'
      : 'elena-dialog';
    if (this.textures.exists(targetKey) && this.elenaImage.texture.key !== targetKey) {
      this.elenaImage.setTexture(targetKey);
    }
  }

  /** Adegan prolog legacy: latar narator zoom-out, Elena setengah badan,
      gradasi gelap, denyut jantung merah tiap 2.4 detik. */
  private stagePrologueScene(): void {
    const soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    const reduce = Boolean(this.registry.get('reduceMotion'));

    // kamera dimulai besar lalu perlahan mundur (zoom 1.16 → 1, pan -18/+12 → 0)
    if (this.bgImage && !reduce) {
      this.tweens.killTweensOf(this.bgImage);
      this.bgImage.setAlpha(1);
      const baseScale = Math.max(GAME_WIDTH / this.bgImage.width, GAME_HEIGHT / this.bgImage.height);
      this.bgImage.setScale(baseScale * 1.16);
      this.bgImage.setPosition(GAME_WIDTH / 2 - 18, GAME_HEIGHT / 2 + 12);
      this.tweens.add({
        targets: this.bgImage,
        scaleX: baseScale,
        scaleY: baseScale,
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        duration: 7500,
        ease: 'Sine.easeOut',
      });
    } else if (this.bgImage) {
      this.bgImage.setAlpha(1);
    }

    // Elena setengah badan (skala frame Figma -557, 229, 4348, 2492)
    const elenaKey = this.textures.exists('elena-dialog-sad') ? 'elena-dialog-sad' : 'elena-dialog';
    if (this.textures.exists(elenaKey)) {
      const fScale = GAME_WIDTH / 3233;
      const fTop = (GAME_HEIGHT - 2102 * fScale) / 2;
      const ex = -557 * fScale;
      const ey = 229 * fScale + fTop;
      const ew = 4348 * fScale;
      const eh = 2492 * fScale;

      this.elenaImage = this.add.image(ex, ey, elenaKey)
        .setOrigin(0)
        .setDisplaySize(ew, eh)
        .setDepth(5);

      if (!reduce) {
        this.tweens.add({
          targets: this.elenaImage,
          y: `+=4`,
          duration: 2200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    // gradasi bawah + atas (drawPrologueScene legacy)
    const gradients = this.add.graphics().setDepth(6);
    gradients.fillGradientStyle(0x080605, 0x080605, 0x080605, 0x080605, 0, 0, 0.64, 0.64);
    gradients.fillRect(0, GAME_HEIGHT * 0.56, GAME_WIDTH, GAME_HEIGHT * 0.44);
    gradients.fillGradientStyle(0x040405, 0x040405, 0x050506, 0x050506, 0.82, 0.82, 0, 0);
    gradients.fillRect(0, 0, GAME_WIDTH, 210);

    // vignette denyut merah + SFX jantung tiap 2.4 detik
    const vignette = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, this.ensureRedVignette())
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(7)
      .setAlpha(0.12);
    this.temporalPulse = this.add.container(0, 0, [vignette]).setDepth(7);
    const beat = (): void => {
      soundManager?.playHeart();
      if (reduce) return;
      this.tweens.killTweensOf(vignette);
      vignette.setAlpha(0.34);
      this.tweens.add({ targets: vignette, alpha: 0.12, duration: 620, ease: 'Sine.easeOut' });
    };
    this.time.addEvent({ delay: 2400, loop: true, callback: beat });
    beat();
  }

  /** Tekstur vignette merah radial (pusat transparan → tepi rgba(190,30,30)). */
  private ensureRedVignette(): string {
    const key = 'ui-red-vignette';
    if (!this.textures.exists(key)) {
      const ct = this.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT);
      if (ct) {
        const c = ct.getContext() as unknown as CanvasRenderingContext2D;
        const g = c.createRadialGradient(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_HEIGHT * 0.2, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_HEIGHT * 0.72);
        g.addColorStop(0, 'rgba(190,30,30,0)');
        g.addColorStop(1, 'rgba(190,30,30,.42)');
        c.fillStyle = g;
        c.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ct.refresh();
      }
    }
    return key;
  }
}
