import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { archiveEchoTrails } from '../systems/LoopEchoTrail';
import type { RunState, SaveSystem } from '../systems/SaveSystem';
import { FONT } from '../ui/theme';

export type GlitchSceneData = {
  run: RunState;
};

const CASE_FILES: Record<string, string> = {
  A1: 'MISI YANG DITINGGALKAN — penelitian tak pernah selesai',
  A2: 'OBSESI & PARADOKS — membawa Arthur Tua memicu keretakan waktu',
  B1: 'FORMULA BOCOR — data publik disalahgunakan jadi senjata',
  B2: 'KAPSUL TERKUNCI OLEH KEBENCIAN — Arthur menolak masa depan',
};

function getLoopHint(routeB2: string): string {
  if (routeB2 === 'A1') return '⟩ Petunjuk: kabur membuat penelitian tak pernah selesai — jangan tinggalkan misinya.';
  if (routeB2 === 'A2') return '⟩ Petunjuk: memaksa atau membawa Arthur Tua ke 2088 memicu paradoks — ada pilihan yang lebih ikhlas.';
  if (routeB2 === 'B1') return '⟩ Petunjuk: data yang bocor ke publik justru disalahgunakan — formula perlu disimpan lebih aman.';
  if (routeB2 === 'B2') return '⟩ Petunjuk: Arthur hanya terbuka pada kenangan yang hangat — jawablah dengan empati sejak 1944.';
  return '⟩ Petunjuk: setiap pilihanmu di masa lalu membentuk takdir 2088.';
}

interface GlitchStrip {
  y: number;
  h: number;
  dx: number;
  tint: number;
}

export class GlitchScene extends Phaser.Scene {
  private glitchData!: GlitchSceneData;
  private soundManager?: SoundManager;
  private save!: SaveSystem;
  private strips: GlitchStrip[] = [];
  private stripsGraphics?: Phaser.GameObjects.Graphics;
  private scanGraphics?: Phaser.GameObjects.Graphics;
  private loopTitleRed?: Phaser.GameObjects.Text;
  private loopTitleCyan?: Phaser.GameObjects.Text;
  private loopTitle?: Phaser.GameObjects.Text;
  private resetLine?: Phaser.GameObjects.Text;
  private afterTexts?: Phaser.GameObjects.Container;

  constructor() {
    super('GlitchScene');
  }

  create(data: GlitchSceneData): void {
    this.glitchData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.registry.set('nativeState', 'glitch');
    this.strips = [];

    this.soundManager?.playGlitch();

    const routeB2 = data.run.routeB2 || '';

    archiveEchoTrails(data.run);
    data.run.loop += 1;
    data.run.empathy = 0;
    data.run.logic = 0;
    data.run.routeB1 = '';
    data.run.routeB2 = '';
    data.run.watchRepaired = false;
    data.run.roseRepaired = false;
    data.run.gemAligned = false;
    data.run.photoRepaired = false;
    data.run.challenges = { '1944': null, '1968': null, '1999': null };
    data.run.inventory = {};
    data.run.watchTargets = null;

    this.save.clearCycle();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0507, 1);
    this.stripsGraphics = this.add.graphics();
    this.scanGraphics = this.add.graphics();

    // ⟲ LOOP n besar monospace dengan ghost RGB ±3px (drawGlitch legacy)
    const loopStyle = {
      fontFamily: 'monospace',
      fontSize: '84px',
      fontStyle: 'bold',
    } as const;
    const loopText = `⟲ LOOP ${data.run.loop}`;
    this.loopTitleRed = this.add.text(GAME_WIDTH / 2 - 3, GAME_HEIGHT / 2 - 60, loopText, {
      ...loopStyle, color: 'rgba(226,80,60,.75)',
    }).setOrigin(0.5);
    this.loopTitleCyan = this.add.text(GAME_WIDTH / 2 + 3, GAME_HEIGHT / 2 - 60, loopText, {
      ...loopStyle, color: 'rgba(80,200,255,.75)',
    }).setOrigin(0.5);
    this.loopTitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, loopText, {
      ...loopStyle,
      color: '#E2503C',
      shadow: { color: 'rgba(226,80,60,.9)', blur: 30, fill: true },
    }).setOrigin(0.5);

    this.resetLine = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 4, 'REALITAS TERPECAH — TIMELINE DI-RESET', {
      color: '#F5F0E8', fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold',
    }).setOrigin(0.5);

    // petunjuk + berkas kasus muncul setelah 0.7 detik (legacy)
    this.afterTexts = this.add.container(0, 0).setVisible(false);
    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, getLoopHint(routeB2), {
      color: '#F5F0E8', fontFamily: 'Georgia, serif', fontSize: '15px', fontStyle: 'italic',
      wordWrap: { width: 660, useAdvancedWrap: true }, align: 'center',
    }).setOrigin(0.5);
    const caseTag = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 130, `⟨ BERKAS KASUS ${routeB2 || '—'} : ${CASE_FILES[routeB2] || 'TIMELINE RUNTUH'} ⟩`, {
      color: '#f5f0e8', fontFamily: FONT.META, fontSize: '12px', letterSpacing: 1,
      wordWrap: { width: 700, useAdvancedWrap: true }, align: 'center',
    }).setOrigin(0.5).setAlpha(0.82);
    this.afterTexts.add([hint, caseTag]);
    this.time.delayedCall(700, () => this.afterTexts?.setVisible(true));

    if (!this.registry.get('reduceMotion')) {
      this.cameras.main.shake(600, 0.018);
      // regenerasi pita glitch tiap 90ms + kedip judul
      this.time.addEvent({ delay: 90, loop: true, callback: () => this.regenerateStrips() });
      this.time.addEvent({
        delay: 130,
        loop: true,
        callback: () => {
          const visible = !this.loopTitle?.visible;
          this.loopTitleRed?.setVisible(visible);
          this.loopTitleCyan?.setVisible(visible);
          this.loopTitle?.setVisible(visible);
          this.resetLine?.setVisible(visible);
        },
      });
    } else {
      this.drawStaticStrips();
    }

    this.time.delayedCall(2200, () => {
      this.scene.start('VortexScene', {
        to: '1944',
        rewind: true,
        run: this.glitchData.run,
      });
    });
  }

  /** 14 strip geser + pita warna mode difference (drawGlitch legacy). */
  private regenerateStrips(): void {
    this.strips = Array.from({ length: 14 }, () => ({
      y: Math.random() * GAME_HEIGHT,
      h: 3 + Math.random() * 16,
      dx: (Math.random() - 0.5) * 46,
      tint: Math.random() < 0.5 ? 0xe64d76 : 0x47d9de,
    }));
    this.drawStrips();
    this.drawScanlines();
  }

  private drawStaticStrips(): void {
    this.strips = Array.from({ length: 6 }, (_, i) => ({
      y: 60 + i * 78,
      h: 5,
      dx: i % 2 ? 10 : -10,
      tint: i % 2 ? 0xe64d76 : 0x47d9de,
    }));
    this.drawStrips();
  }

  private drawStrips(): void {
    const g = this.stripsGraphics;
    if (!g) return;
    g.clear();
    for (const strip of this.strips) {
      g.fillStyle(strip.tint, 0.16);
      g.fillRect(strip.dx, strip.y, GAME_WIDTH, strip.h);
      g.fillStyle(0x0a0507, 0.35);
      g.fillRect(0, strip.y, strip.dx, strip.h);
    }
  }

  /** 26 sliver scanline putih tipis. */
  private drawScanlines(): void {
    const g = this.scanGraphics;
    if (!g) return;
    g.clear();
    for (let i = 0; i < 26; i += 1) {
      g.fillStyle(0xffffff, 0.05 + Math.random() * 0.08);
      g.fillRect(Math.random() * GAME_WIDTH * 0.7, Math.random() * GAME_HEIGHT, 40 + Math.random() * 260, 1.4);
    }
  }
}
