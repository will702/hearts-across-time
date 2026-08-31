import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { RunState } from '../systems/SaveSystem';
import { era1968Title } from '../world/era1968';
import { FONT } from '../ui/theme';

export type VortexSceneData = {
  to: '1944' | '1968' | '1999' | '2088';
  rewind?: boolean;
  intro?: boolean;
  run: RunState;
};

const ERA_CAPTIONS: Record<string, string> = {
  '1944': 'BABAK 1 — GARIS DEPAN, 1944',
  '1968': 'BABAK 2 — LABORATORIUM BOTANI, 1968',
  '1999': 'BABAK 3 — RUANG KAPSUL KRIOGENIK, 1999',
  '2088': 'TAHUN 2088 — MASA DEPAN PENUH KENANGAN',
};

const ERA_YEARS: Record<string, number> = { '1944': 1944, '1968': 1968, '1999': 1999, '2088': 2088 };
const DURATION = 2800;
const PORTAL_CENTER_Y = 218;

function easeIO(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class VortexScene extends Phaser.Scene {
  private vortexData!: VortexSceneData;
  private soundManager?: SoundManager;
  private elapsed = 0;
  private finishing = false;
  private swarmGraphics?: Phaser.GameObjects.Graphics;
  private ringGraphics?: Phaser.GameObjects.Graphics;
  private coreGraphics?: Phaser.GameObjects.Graphics;
  private yearRed?: Phaser.GameObjects.Text;
  private yearCyan?: Phaser.GameObjects.Text;
  private yearMain?: Phaser.GameObjects.Text;
  private captionText?: Phaser.GameObjects.Text;
  private eraText?: Phaser.GameObjects.Text;
  private whiteOut?: Phaser.GameObjects.Rectangle;
  private displayedYear = 2088;
  private fromYear = 2088;
  private toYear = 1944;

  constructor() {
    super('VortexScene');
  }

  create(data: VortexSceneData): void {
    this.vortexData = { ...data, intro: data.intro ?? true };
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'vortex');
    this.elapsed = 0;
    this.finishing = false;

    this.soundManager?.playVortex(Boolean(data.rewind));

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050508, 1);
    const hasVideo = this.cache.video.exists('cutscene-video-vortex');
    if (hasVideo && !this.registry.get('reduceMotion')) {
      try {
        const video = this.add.video(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'cutscene-video-vortex')
          .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
          .setDepth(1)
          .setAlpha(0.2);
        video.play(true);
      } catch {
        // fallback
      }
    }

    const vortexTexture = data.rewind && this.textures.exists('time-vortex-investigation')
      ? 'time-vortex-investigation'
      : 'time-vortex';
    if (this.textures.exists(vortexTexture)) {
      const portal = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, vortexTexture)
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setDepth(2)
        .setAlpha(0.86);
      if (!this.registry.get('reduceMotion')) {
        this.tweens.add({
          targets: portal,
          scaleX: portal.scaleX * 1.035,
          scaleY: portal.scaleY * 1.035,
          angle: data.rewind ? -0.35 : 0.35,
          duration: DURATION,
          ease: 'Sine.easeInOut',
        });
      }
    }

    this.ringGraphics = this.add.graphics().setDepth(3);
    this.swarmGraphics = this.add.graphics().setDepth(4);
    this.coreGraphics = this.add.graphics().setDepth(5);
    this.drawMachineFrame();

    // Penghitung tahun menjadi fokus jendela mesin, sedikit di atas pusat layar.
    const yearStyle = {
      fontFamily: FONT.TITLE,
      fontSize: '72px',
      fontStyle: 'bold',
      letterSpacing: 5,
    } as const;
    this.yearRed = this.add.text(GAME_WIDTH / 2 - 2, PORTAL_CENTER_Y, '', {
      ...yearStyle, color: 'rgba(226,80,60,.42)',
    }).setOrigin(0.5).setDepth(7);
    this.yearCyan = this.add.text(GAME_WIDTH / 2 + 2, PORTAL_CENTER_Y, '', {
      ...yearStyle, color: 'rgba(80,200,255,.48)',
    }).setOrigin(0.5).setDepth(7);
    this.yearMain = this.add.text(GAME_WIDTH / 2, PORTAL_CENTER_Y, '', {
      ...yearStyle,
      color: data.rewind ? '#ffd3c4' : '#eefbff',
      shadow: {
        color: data.rewind ? 'rgba(255,110,80,.95)' : 'rgba(80,200,255,.95)',
        blur: 18,
        fill: true,
      },
      stroke: data.rewind ? '#7d2922' : '#225e78',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(8);

    const caption = data.rewind
      ? 'SINYAL REALITAS TERPUTUS — MENGULANG SIKLUS'
      : 'MELOMPAT MENEMBUS ARUS WAKTU';
    this.captionText = this.add.text(GAME_WIDTH / 2, 468, caption, {
      color: '#f5f0e8', fontFamily: FONT.META, fontSize: '14px', fontStyle: 'bold', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(8);

    const eraCaption = data.to === '1968' ? era1968Title(data.run.routeB1) : (ERA_CAPTIONS[data.to] || '');
    if (eraCaption && !data.rewind) {
      this.eraText = this.add.text(GAME_WIDTH / 2, 498, eraCaption, {
        color: 'rgba(194,229,242,.82)', fontFamily: FONT.META, fontSize: '11px', letterSpacing: 1,
      }).setOrigin(0.5).setDepth(8);
    }

    this.whiteOut = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0).setDepth(10);

    this.fromYear = data.rewind ? 1999 : (data.to === '1944' ? 2088 : data.to === '1968' ? 1944 : 1968);
    this.toYear = ERA_YEARS[data.to] ?? 1944;
    this.displayedYear = this.fromYear;

    this.playIntroTween();

    this.time.delayedCall(DURATION, () => this.finish());
  }

  update(_time: number, delta: number): void {
    // Progress waktu adalah state transisi, bukan dekorasi. Ia harus tetap maju
    // saat reduced motion aktif agar angka tahun dan white-out tidak membeku.
    this.elapsed += delta / 1000;
    const p = Phaser.Math.Clamp(this.elapsed / (DURATION / 1000), 0, 1);
    this.drawRings();
    this.drawSwarm();
    this.drawCore(p);

    const year = Math.round(Phaser.Math.Linear(this.fromYear, this.toYear, easeIO(p)));
    this.displayedYear = year;
    const text = String(year);
    this.yearRed?.setText(text);
    this.yearCyan?.setText(text);
    this.yearMain?.setText(text);

    // white-out setelah 82% (legacy)
    this.whiteOut?.setAlpha(Phaser.Math.Clamp((p - 0.82) / 0.18, 0, 1) * 0.9);

    // Safari dapat menunda timer ketika tab kehilangan fokus. Jadikan progres
    // frame sebagai sumber kebenaran kedua agar transisi tetap selesai tepat
    // setelah tahun tujuan tercapai, tanpa bergantung hanya pada delayedCall.
    if (p >= 1) this.finish();
  }

  /** Cincin elips konsentris sian/merah (drawVortex legacy). */
  private drawRings(): void {
    const g = this.ringGraphics;
    if (!g) return;
    g.clear();
    const cx = GAME_WIDTH / 2;
    const cy = PORTAL_CENTER_Y;
    const rewind = Boolean(this.vortexData.rewind);
    for (let r = 40; r <= 430; r += 34) {
      const phase = ((this.elapsed * (rewind ? -60 : 80) + r) % 430 + 430) % 430;
      const alpha = Math.max(0, 0.5 - phase / 900);
      g.lineStyle(r % 3 === 0 ? 2.5 : 1.4, rewind ? 0xe2503c : 0x50c8ff, alpha);
      g.strokeEllipse(cx, cy, phase * 1.85, phase * 0.9);
    }
  }

  /** 46 partikel persegi berputar (swarm legacy). */
  private drawSwarm(): void {
    const g = this.swarmGraphics;
    if (!g) return;
    g.clear();
    const cx = GAME_WIDTH / 2;
    const cy = PORTAL_CENTER_Y;
    const rewind = Boolean(this.vortexData.rewind);
    for (let i = 0; i < 46; i += 1) {
      const speed = 1 + (i % 5) * 0.22;
      const angle = i * 2.399 + this.elapsed * (rewind ? -1.15 : 1.5) * speed;
      const radius = 430 - ((this.elapsed * 140 * speed + i * 97) % 390);
      const x = cx + Math.cos(angle) * radius * 1.35;
      const y = cy + Math.sin(angle) * radius * 0.52;
      const size = 2 + (i % 4);
      const alpha = Math.max(0.08, 0.5 - radius / 1000);
      g.fillStyle(rewind ? 0xe2503c : 0x50c8ff, alpha);
      g.fillRect(x - size / 2, y - size / 2, size, size * 0.7);
    }
  }

  /** Inti berdenyut + glow radial. */
  private drawCore(p: number): void {
    const g = this.coreGraphics;
    if (!g) return;
    g.clear();
    const cx = GAME_WIDTH / 2;
    const cy = PORTAL_CENTER_Y;
    const rewind = Boolean(this.vortexData.rewind);
    const pulse = 0.8 + 0.2 * Math.sin(this.elapsed * 9);
    const coreR = (18 + p * 30) * pulse;
    g.fillStyle(rewind ? 0x50c8ff : 0xffe6c8, 0.16);
    g.fillCircle(cx, cy, coreR * 3.4);
    g.fillStyle(rewind ? 0xb9e6ff : 0xfff0d8, 0.3);
    g.fillCircle(cx, cy, coreR * 1.9);
    g.fillStyle(rewind ? 0xfff0e8 : 0xffffff, 0.65);
    g.fillCircle(cx, cy, coreR * 0.7);
  }

  /** Bingkai kokpit menyatukan portal, kontrol, dan informasi tujuan. */
  private drawMachineFrame(): void {
    const frame = this.add.graphics().setDepth(6);

    frame.fillStyle(0x08131f, 0.94);
    frame.fillTriangle(0, 0, 118, 0, 0, 430);
    frame.fillTriangle(GAME_WIDTH, 0, GAME_WIDTH - 118, 0, GAME_WIDTH, 430);
    frame.lineStyle(5, 0x6baed0, 0.82);
    frame.strokeEllipse(GAME_WIDTH / 2, PORTAL_CENTER_Y, 872, 472);
    frame.lineStyle(2, 0xbdefff, 0.58);
    frame.strokeEllipse(GAME_WIDTH / 2, PORTAL_CENTER_Y, 850, 450);

    frame.fillStyle(0x102437, 0.97);
    frame.fillRect(0, 426, GAME_WIDTH, 114);
    frame.lineStyle(4, 0x6baed0, 0.78);
    frame.lineBetween(0, 426, GAME_WIDTH, 426);
    frame.fillStyle(0x213d54, 0.96);
    frame.fillRoundedRect(248, 446, 464, 76, 10);
    frame.lineStyle(2, 0x92d7ec, 0.45);
    frame.strokeRoundedRect(248, 446, 464, 76, 10);

    for (const x of [38, 70, 102, 826, 858, 890, 922]) {
      frame.fillStyle(x < 400 ? 0xe9b668 : 0x70d5df, 0.88);
      frame.fillCircle(x, 479, 7);
      frame.lineStyle(2, 0xd8eff5, 0.6);
      frame.lineBetween(x, 486, x, 511);
    }

    frame.fillStyle(0x8fd9ea, 0.72);
    frame.fillRoundedRect(24, 20, 118, 42, 6);
    frame.fillRoundedRect(818, 20, 118, 42, 6);
    this.add.text(83, 41, 'FLUKS WAKTU', {
      color: '#07131f', fontFamily: FONT.META, fontSize: '9px', fontStyle: 'bold', letterSpacing: 1,
    }).setOrigin(0.5).setDepth(7);
    this.add.text(877, 41, 'TUJUAN TERKUNCI', {
      color: '#07131f', fontFamily: FONT.META, fontSize: '9px', fontStyle: 'bold', letterSpacing: 1,
    }).setOrigin(0.5).setDepth(7);
  }

  private playIntroTween(): void {
    const reduceMotion = Boolean(this.registry.get('reduceMotion'));
    const yearLayers = [this.yearRed, this.yearCyan, this.yearMain].filter(Boolean) as Phaser.GameObjects.Text[];
    if (reduceMotion) return;

    for (const layer of yearLayers) {
      layer.setY(PORTAL_CENTER_Y + 26).setScale(0.82).setAlpha(0);
    }
    this.captionText?.setY(480).setAlpha(0);
    this.eraText?.setY(510).setAlpha(0);

    this.tweens.add({
      targets: yearLayers,
      y: PORTAL_CENTER_Y,
      scale: 1,
      alpha: 1,
      duration: 650,
      ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: [this.captionText, this.eraText].filter(Boolean),
      y: '-=12',
      alpha: 1,
      delay: 220,
      duration: 620,
      ease: 'Sine.easeOut',
    });
  }

  snapshot(): Record<string, unknown> {
    return {
      destination: this.vortexData.to,
      displayedYear: this.displayedYear,
      targetYear: this.toYear,
    };
  }

  private finish(): void {
    if (this.finishing) return;
    this.finishing = true;

    const to = this.vortexData.to;
    const intro = Boolean(this.vortexData.intro);

    if (to === '1944') {
      if (this.vortexData.rewind) this.vortexData.run.diaryRead = false;
      this.scene.start('Era1944Scene', { run: this.vortexData.run, intro });
    } else if (to === '1968') {
      this.scene.start('Era1968Scene', { run: this.vortexData.run, intro });
    } else if (to === '1999') {
      this.scene.start('Era1999Scene', { run: this.vortexData.run, intro });
    } else {
      this.scene.start('TitleScene');
    }
  }
}
