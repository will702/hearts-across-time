import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { RunState } from '../systems/SaveSystem';
import { era1968Title } from '../world/era1968';

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

export class VortexScene extends Phaser.Scene {
  private vortexData!: VortexSceneData;
  private soundManager?: SoundManager;
  private elapsed = 0;
  private captionText?: Phaser.GameObjects.Text;
  private tunnelGraphics?: Phaser.GameObjects.Graphics;

  constructor() {
    super('VortexScene');
  }

  create(data: VortexSceneData): void {
    this.vortexData = { ...data, intro: data.intro ?? true };
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'vortex');
    this.elapsed = 0;

    this.soundManager?.playVortex(Boolean(data.rewind));

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x030206, 1);
    if (this.textures.exists('time-vortex')) {
      const art = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'time-vortex')
        .setDisplaySize(GAME_WIDTH + 80, GAME_HEIGHT + 45)
        .setAlpha(0.46);
      if (!this.registry.get('reduceMotion')) {
        this.tweens.add({
          targets: art,
          angle: { from: -1.5, to: 1.5 },
          scaleX: art.scaleX * 1.025,
          scaleY: art.scaleY * 1.025,
          duration: 1600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
      }
    }
    this.tunnelGraphics = this.add.graphics();

    const title = data.rewind ? 'MEMUTAR KEMBALI PUSARAN WAKTU…' : 'MELOMPAT MELEWATI DIMENSI WAKTU…';
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 45, title, {
      color: data.rewind ? '#f87171' : '#67e8f9',
      fontFamily: 'Cinzel, serif',
      fontSize: '20px',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    const caption = data.to === '1968' ? era1968Title(data.run.routeB1) : (ERA_CAPTIONS[data.to] || '');
    this.captionText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15, caption, {
      color: '#fff',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '15px',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.time.delayedCall(1600, () => this.finish());
  }

  update(_time: number, delta: number): void {
    if (!this.registry.get('reduceMotion')) this.elapsed += delta / 1000;
    this.drawTunnel();
  }

  private drawTunnel(): void {
    if (!this.tunnelGraphics) return;
    this.tunnelGraphics.clear();

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const isRewind = Boolean(this.vortexData.rewind);
    const color = isRewind ? 0xef4444 : 0x06b6d4;

    for (let i = 1; i <= 6; i++) {
      const radius = ((this.elapsed * 130 + i * 45) % 280);
      const alpha = 1 - (radius / 280);
      this.tunnelGraphics.lineStyle(3, color, alpha);
      this.tunnelGraphics.strokeCircle(cx, cy, radius);
    }
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
