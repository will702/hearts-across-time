import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

const INTRO_PAGES = [
  {
    title: 'MISI: PUTUSKAN LINGKARAN WAKTU',
    lead: 'Tahun 2088 di ambang kepunahan. Setiap pilihanmu dapat mengubah takdir dan alur cerita ke depannya.',
    rows: [
      ['⏳', 'Jelajahi tahun 1944, 1968, dan 1999 untuk menulis ulang nasib Arthur.'],
      ['✦', 'Racik formula penawar sebelum Virus Crimson melenyapkan masa depan.'],
      ['↻', 'Jika garis waktu runtuh, siklus akan berulang—namun ingatan dan pengetahuanmu tetap abadi.'],
    ],
  },
  {
    title: 'BERGERAK MELINTASI WAKTU',
    lead: 'Setiap era menyimpan jalan, petunjuk, dan bahaya berbeda.',
    rows: [
      ['← →', 'Bergerak dengan ← → atau A D. Tahan SHIFT untuk berlari.'],
      ['▼', 'Tekan ↓, S, ENTER, atau SPACE untuk memeriksa benda.'],
      ['ENTER', 'Lanjutkan dialog dengan ENTER, SPACE, klik, atau sentuhan.'],
    ],
  },
  {
    title: 'PILIHANMU MEMBENTUK ARTHUR',
    lead: 'Game tidak akan mengatakan pilihan mana yang “benar”.',
    rows: [
      ['1 / 2 / 3', 'Pilih dengan ↑ ↓ lalu ENTER, atau tekan nomor opsi yang tersedia.'],
      ['♥ ⚙', 'Ucapan dan cara menyelesaikan tantangan diam-diam mengubah Arthur.'],
      ['★', 'Baca buku harian, temukan jejak cerita, dan ungkap akhir sejati.'],
    ],
  },
] as const;

export class PrologueScene extends Phaser.Scene {
  private save!: SaveSystem;
  private run!: RunState;
  private page = 0;
  private pageContainer?: Phaser.GameObjects.Container;
  private started = false;

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

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050407, 1);

    if (this.textures.exists('bgnarator')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bgnarator')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.45);
    }

    this.showPage();
    this.input.keyboard?.on('keydown-LEFT', () => this.movePage(-1));
    this.input.keyboard?.on('keydown-UP', () => this.movePage(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.movePage(1));
    this.input.keyboard?.on('keydown-DOWN', () => this.movePage(1));
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
    objects.push(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 736, 420, 0xf4ead8, 0.98).setStrokeStyle(3, 0x6a4930));
    objects.push(this.add.text(GAME_WIDTH / 2, 105, page.title, {
      color: '#94342e', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5));
    objects.push(this.add.text(GAME_WIDTH / 2, 154, page.lead, {
      color: '#2b211a', fontFamily: 'Patrick Hand, sans-serif', fontSize: '17px', fontStyle: 'italic',
      align: 'center', wordWrap: { width: 640, useAdvancedWrap: true },
    }).setOrigin(0.5));

    page.rows.forEach(([icon, text], index) => {
      const y = 218 + index * 64;
      objects.push(this.add.rectangle(GAME_WIDTH / 2, y, 630, 51, 0x5a4a3c, 0.055).setStrokeStyle(1, 0x2b211a, 0.24));
      objects.push(this.add.text(205, y, icon, {
        color: '#55677a', fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontStyle: 'bold', align: 'center', fixedWidth: 70,
      }).setOrigin(0.5));
      objects.push(this.add.text(240, y, text, {
        color: '#2b211a', fontFamily: 'Poppins, sans-serif', fontSize: '14px', wordWrap: { width: 535, useAdvancedWrap: true },
      }).setOrigin(0, 0.5));
    });

    objects.push(this.add.text(GAME_WIDTH / 2, 414, `HALAMAN ${this.page + 1} / ${INTRO_PAGES.length}`, {
      color: '#94342e', fontFamily: 'Poppins, sans-serif', fontSize: '11px', fontStyle: 'bold', letterSpacing: 1,
    }).setOrigin(0.5));
    const back = this.add.text(285, 451, '‹ KEMBALI', {
      backgroundColor: this.page > 0 ? '#5a4a3c22' : '#5a4a3c0c', color: this.page > 0 ? '#4f4236' : '#4f423655',
      fontFamily: 'Poppins, sans-serif', fontSize: '13px', padding: { x: 48, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: this.page > 0 }).on('pointerup', () => this.movePage(-1));
    const next = this.add.text(680, 451, this.page === INTRO_PAGES.length - 1 ? 'MULAI PERJALANAN ›' : 'LANJUT ›', {
      backgroundColor: '#94342e', color: '#fff8ea', fontFamily: 'Poppins, sans-serif', fontSize: '13px', padding: { x: 34, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.movePage(1));
    const skip = this.add.text(805, 82, 'LEWATI ×', {
      color: '#94342e', fontFamily: 'Poppins, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.startDialogue());
    objects.push(back, next, skip);
    this.pageContainer = this.add.container(0, 0, objects);
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
    soundManager?.playHeart();
    this.scene.launch('DialogueScene', {
      nodeId: 'prologue',
      run: this.run,
      onComplete: (action?: { type: string; to?: string }) => {
        if (action?.type === 'vortex' || action?.to === '1944') {
          this.scene.start('VortexScene', { to: '1944', run: this.run });
        } else {
          this.scene.start('Era1944Scene', { run: this.run, intro: true });
        }
      },
    });
  }
}
