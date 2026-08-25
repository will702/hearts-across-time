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
  private shardGraphics?: Phaser.GameObjects.Graphics;

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
        .setAlpha(0.72);
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
    this.shardGraphics = this.add.graphics();

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
    this.drawTimeShards();
  }

  private drawTunnel(): void {
    if (!this.tunnelGraphics) return;
    this.tunnelGraphics.clear();

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const isRewind = Boolean(this.vortexData.rewind);
    const eraColor = { '1944': 0xd6a85f, '1968': 0x7ccf9b, '1999': 0x67e8f9, '2088': 0xc084fc }[this.vortexData.to];
    const color = isRewind ? 0xef4444 : eraColor;

    for (let i = 1; i <= 9; i++) {
      const radius = ((this.elapsed * 155 + i * 34) % 310);
      const alpha = 1 - (radius / 280);
      this.tunnelGraphics.lineStyle(i % 3 === 0 ? 4 : 2, color, Math.max(0, alpha) * 0.78);
      this.tunnelGraphics.strokeEllipse(cx, cy, radius * 1.28, radius * 0.72);
    }
  }

  private drawTimeShards(): void {
    if (!this.shardGraphics) return;
    this.shardGraphics.clear();
    const reduced = Boolean(this.registry.get('reduceMotion'));
    const t = reduced ? 0.8 : this.elapsed;
    const color = this.vortexData.rewind ? 0xfca5a5 : 0xf7d984;
    for (let i = 0; i < 12; i += 1) {
      const angle = i / 12 * Math.PI * 2 + t * (i % 2 ? -0.34 : 0.28);
      const radius = 115 + ((i * 43 + t * 72) % 245);
      const x = GAME_WIDTH / 2 + Math.cos(angle) * radius * 1.28;
      const y = GAME_HEIGHT / 2 + Math.sin(angle) * radius * 0.58;
      const size = 3 + i % 4;
      this.shardGraphics.fillStyle(color, 0.22 + (i % 3) * 0.12);
      this.shardGraphics.fillTriangle(x, y - size * 2, x + size, y + size, x - size, y + size);
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
