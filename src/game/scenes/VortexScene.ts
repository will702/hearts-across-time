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
const DURATION = 2400;

function easeIO(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class VortexScene extends Phaser.Scene {
  private vortexData!: VortexSceneData;
  private soundManager?: SoundManager;
  private elapsed = 0;
  private swarmGraphics?: Phaser.GameObjects.Graphics;
  private ringGraphics?: Phaser.GameObjects.Graphics;
  private coreGraphics?: Phaser.GameObjects.Graphics;
  private yearRed?: Phaser.GameObjects.Text;
  private yearCyan?: Phaser.GameObjects.Text;
  private yearMain?: Phaser.GameObjects.Text;
  private captionText?: Phaser.GameObjects.Text;
  private whiteOut?: Phaser.GameObjects.Rectangle;
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

    this.soundManager?.playVortex(Boolean(data.rewind));

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050508, 1);
    const hasVideo = this.cache.video.exists('cutscene-video-vortex');
    if (hasVideo && !this.registry.get('reduceMotion')) {
      try {
        const video = this.add.video(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'cutscene-video-vortex')
          .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
          .setDepth(1)
          .setAlpha(0.88);
        video.play(true);
      } catch {
        // fallback
      }
    } else if (this.textures.exists('time-vortex')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'time-vortex')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setAlpha(0.3);
    }

    this.ringGraphics = this.add.graphics();
    this.swarmGraphics = this.add.graphics();
    this.coreGraphics = this.add.graphics();

    // penghitung tahun besar monospace dengan RGB split (legacy)
    const yearStyle = {
      fontFamily: 'monospace',
      fontSize: '64px',
      fontStyle: 'bold',
    } as const;
    this.yearRed = this.add.text(GAME_WIDTH / 2 - 3, GAME_HEIGHT / 2 - 10, '', {
      ...yearStyle, color: 'rgba(226,80,60,.8)',
    }).setOrigin(0.5);
    this.yearCyan = this.add.text(GAME_WIDTH / 2 + 3, GAME_HEIGHT / 2 - 10, '', {
      ...yearStyle, color: 'rgba(80,200,255,.8)',
    }).setOrigin(0.5);
    this.yearMain = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, '', {
      ...yearStyle,
      color: data.rewind ? 'rgba(255,110,80,.95)' : 'rgba(180,235,255,.95)',
      shadow: {
        color: data.rewind ? 'rgba(255,110,80,.9)' : 'rgba(140,220,255,.9)',
        blur: 24,
        fill: true,
      },
    }).setOrigin(0.5);

    const caption = data.rewind
      ? 'SINYAL REALITAS TERPUTUS — MENGULANG SIKLUS'
      : 'MELOMPAT MENEMBUS ARUS WAKTU';
    this.captionText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 64, caption, {
      color: '#f5f0e8', fontFamily: FONT.META, fontSize: '14px', letterSpacing: 2,
    }).setOrigin(0.5);

    const eraCaption = data.to === '1968' ? era1968Title(data.run.routeB1) : (ERA_CAPTIONS[data.to] || '');
    if (eraCaption && !data.rewind) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 36, eraCaption, {
        color: 'rgba(245,240,232,.55)', fontFamily: FONT.META, fontSize: '11px', letterSpacing: 1,
      }).setOrigin(0.5);
    }

    this.whiteOut = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0).setDepth(10);

    this.fromYear = data.rewind ? 1999 : (data.to === '1944' ? 2088 : data.to === '1968' ? 1944 : 1968);
    this.toYear = ERA_YEARS[data.to] ?? 1944;

    this.time.delayedCall(DURATION, () => this.finish());
  }

  update(_time: number, delta: number): void {
    if (!this.registry.get('reduceMotion')) this.elapsed += delta / 1000;
    const p = Phaser.Math.Clamp(this.elapsed / (DURATION / 1000), 0, 1);
    this.drawRings();
    this.drawSwarm();
    this.drawCore(p);

    const year = Math.round(Phaser.Math.Linear(this.fromYear, this.toYear, easeIO(p)));
    const text = String(year);
    this.yearRed?.setText(text);
    this.yearCyan?.setText(text);
    this.yearMain?.setText(text);

    // white-out setelah 82% (legacy)
    this.whiteOut?.setAlpha(Phaser.Math.Clamp((p - 0.82) / 0.18, 0, 1) * 0.9);
  }

  /** Cincin elips konsentris sian/merah (drawVortex legacy). */
  private drawRings(): void {
    const g = this.ringGraphics;
    if (!g) return;
    g.clear();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const rewind = Boolean(this.vortexData.rewind);
    for (let r = 40; r <= 430; r += 34) {
      const phase = ((this.elapsed * (rewind ? -60 : 80) + r) % 430 + 430) % 430;
      const alpha = Math.max(0, 0.5 - phase / 900);
      g.lineStyle(r % 3 === 0 ? 2.5 : 1.4, rewind ? 0xe2503c : 0x50c8ff, alpha);
      g.strokeEllipse(cx, cy, phase * 2, phase);
    }
  }

  /** 46 partikel persegi berputar (swarm legacy). */
  private drawSwarm(): void {
    const g = this.swarmGraphics;
    if (!g) return;
    g.clear();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const rewind = Boolean(this.vortexData.rewind);
    for (let i = 0; i < 46; i += 1) {
      const speed = 1 + (i % 5) * 0.22;
      const angle = i * 2.399 + this.elapsed * (rewind ? -1.15 : 1.5) * speed;
      const radius = 430 - ((this.elapsed * 140 * speed + i * 97) % 390);
      const x = cx + Math.cos(angle) * radius * 1.35;
      const y = cy + Math.sin(angle) * radius * 0.62;
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
    const cy = GAME_HEIGHT / 2;
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

  private finish(): void {
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
