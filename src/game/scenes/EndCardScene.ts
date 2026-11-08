import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config';
import { buildRunRecap, deriveEndingProgress, type EndingProgress, type RunRecap } from '../minigames/endingProgress';
import { LORE_COMPLETION_TEXT } from '../narrative/lore';
import { defaultRun, type RunState, SaveSystem } from '../systems/SaveSystem';
import { ensureFrostTexture } from '../ui/paper';
import { FONT } from '../ui/theme';

export type EndCardData = {
  run?: RunState;
};

interface RisingHeart {
  gfx: Phaser.GameObjects.Graphics;
  vy: number;
  sway: number;
  born: number;
}

export class EndCardScene extends Phaser.Scene {
  private save!: SaveSystem;
  private soundManager?: SoundManager;
  private recap!: RunRecap;
  private endingProgress!: EndingProgress;
  private elapsed = 0;
  private hearts: RisingHeart[] = [];
  private replayText?: Phaser.GameObjects.Text;

  constructor() {
    super('EndCardScene');
  }

  create(data: EndCardData = {}): void {
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'endcard');
    this.elapsed = 0;
    this.hearts = [];

    const run = data.run ?? this.save.data.game?.S ?? defaultRun();
    this.recap = buildRunRecap(run, this.save.data.inspected);
    this.endingProgress = deriveEndingProgress(this.save.data.endings, 'true');

    this.save.data.endings.true = 1;
    this.save.clearCycle();

    this.soundManager?.setSong('end');
    this.soundManager?.playSuccessFanfare();

    this.renderBackground();
    this.renderTitles();
    this.renderStats();

    // ▸ MAIN LAGI berkedip setelah 2.6 detik (legacy)
    this.replayText = this.add.text(GAME_WIDTH / 2, 452, '▸ MAIN LAGI (ENTER / SENTUH)', {
      color: 'rgba(245,240,232,.75)', fontFamily: FONT.UI, fontSize: '15.5px',
    }).setOrigin(0.5).setVisible(false);
    this.time.delayedCall(2600, () => {
      this.replayText?.setVisible(true);
      this.time.addEvent({
        delay: 500,
        loop: true,
        callback: () => this.replayText?.setVisible(!this.replayText?.visible),
      });
    });

    // bingkai ganda kartu komik penutup (legacy)
    const frame = this.add.graphics();
    frame.lineStyle(2.6, 0x16100a, 0.6);
    frame.strokeRoundedRect(10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20, 6);
    frame.lineStyle(1, 0x16100a, 0.35);
    frame.strokeRoundedRect(16, 16, GAME_WIDTH - 32, GAME_HEIGHT - 32, 4);

    if (!this.registry.get('reduceMotion')) {
      this.time.addEvent({ delay: 340, loop: true, callback: () => this.spawnHeart() });
    }

    this.input.keyboard?.once('keydown-SPACE', () => this.goToTitle());
    this.input.keyboard?.once('keydown-ENTER', () => this.goToTitle());
    this.input.once('pointerup', () => this.goToTitle());
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

  update(_time: number, delta: number): void {
    this.elapsed += delta / 1000;
    for (let i = this.hearts.length - 1; i >= 0; i -= 1) {
      const heart = this.hearts[i];
      heart.gfx.y += heart.vy * (delta / 1000);
      heart.gfx.x += Math.sin(this.elapsed * 1.4 + heart.sway) * 0.18;
      const life = this.elapsed - heart.born;
      heart.gfx.setAlpha(Phaser.Math.Clamp(life * 1.4, 0, 0.8) * Phaser.Math.Clamp(1 - (life - 2.6) / 1.4, 0, 1));
      if (heart.gfx.y < -20 || life > 4) {
        heart.gfx.destroy();
        this.hearts.splice(i, 1);
      }
    }
  }

  /** Laboratorium 1999 redup + Elena berlutut memegang vial + selaput beku. */
  private renderBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0806, 1);
    if (this.textures.exists('lab-final')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'lab-final')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setAlpha(0.8);
    }
    if (this.textures.exists('bg1999-fg')) {
      this.add.image(0, GROUND_Y - 14, 'bg1999-fg').setOrigin(0).setDisplaySize(1120, 152);
    }

    if (this.textures.exists('pose-elena-kneel')) {
      const pose = this.add.image(GAME_WIDTH / 2 - 60, GROUND_Y, 'pose-elena-kneel')
        .setOrigin(0.5, 1);
      pose.setScale(104 / pose.height);
      this.add.ellipse(GAME_WIDTH / 2 - 60, GROUND_Y + 3, 40, 8, 0x0a0806, 0.28);
    }

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ensureFrostTexture(this))
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setAlpha(0.42);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0806, 0.55);
  }

  private renderTitles(): void {
    const fade = (target: Phaser.GameObjects.Text, delay: number): void => {
      target.setAlpha(0);
      this.tweens.add({ targets: target, alpha: 1, duration: 500, delay });
    };

    fade(this.add.text(GAME_WIDTH / 2, 168, 'THE END', {
      color: '#f5f0e8', fontFamily: 'Georgia, serif', fontSize: '26px', fontStyle: 'italic',
    }).setOrigin(0.5), 0);

    fade(this.add.text(GAME_WIDTH / 2, 208, 'HEARTS ACROSS TIME: BREAK THE LOOP', {
      color: '#c23b3b', fontFamily: 'Georgia, serif', fontSize: '30px', fontStyle: 'bold',
    }).setOrigin(0.5), 200);
  }

  /** Statistik afinitas tersembunyi terungkap + rekap siklus (legacy P4). */
  private renderStats(): void {
    const group = this.add.container(0, 0).setAlpha(0);
    this.tweens.add({ targets: group, alpha: 1, duration: 700, delay: 1600 });

    const cycle = this.add.text(GAME_WIDTH / 2, 286, `Siklus ditempuh : ${this.recap.loop}× loop`, {
      color: 'rgba(245,240,232,.85)', fontFamily: FONT.UI, fontSize: '16px',
    }).setOrigin(0.5);
    group.add(cycle);

    const total = Math.max(1, this.recap.empathy + this.recap.logic);
    group.add(this.affinityBar('EMPATI', this.recap.empathy, total, 315, 0xa85550));
    group.add(this.affinityBar('LOGIKA', this.recap.logic, total, 341, 0x556b7f));

    // chip rute + pendekatan tantangan (inkTag legacy)
    const chips: Array<{ label: string; color: number }> = [];
    this.recap.routes.forEach(route => chips.push({ label: route, color: 0x55614c }));
    this.recap.challenges.forEach(entry => {
      if (entry.result === 'empathy') chips.push({ label: `${entry.era} EMPATI`, color: 0x7e4a46 });
      else if (entry.result === 'logic') chips.push({ label: `${entry.era} LOGIKA`, color: 0x48596b });
    });
    const chipW = chips.map(chip => chip.label.length * 6 + 20);
    const totalW = chipW.reduce((sum, w) => sum + w, 0) + Math.max(0, chips.length - 1) * 8;
    let cx = GAME_WIDTH / 2 - totalW / 2;
    chips.forEach((chip, i) => {
      const tag = this.add.graphics();
      tag.fillStyle(chip.color, 1);
      tag.fillRoundedRect(cx, 360, chipW[i], 19, 4);
      tag.lineStyle(1.4, 0x1e1710, 1);
      tag.strokeRoundedRect(cx, 360, chipW[i], 19, 4);
      const label = this.add.text(cx + chipW[i] / 2, 369.5, chip.label, {
        color: '#F3EADA', fontFamily: FONT.UI, fontSize: '10.5px', fontStyle: 'bold',
      }).setOrigin(0.5);
      group.add([tag, label]);
      cx += chipW[i] + 8;
    });

    if (this.recap.loreComplete) {
      const lore = this.add.text(GAME_WIDTH / 2, 397, `✦ ${LORE_COMPLETION_TEXT}`, {
        color: '#F1D58B', fontFamily: 'Georgia, serif', fontSize: '13.5px', fontStyle: 'italic',
        wordWrap: { width: 760, useAdvancedWrap: true }, align: 'center',
      }).setOrigin(0.5);
      group.add(lore);
    }

    const quote = this.add.text(GAME_WIDTH / 2, 422, '"...di tahun 2088, kita akan bertemu lagi sebagai dua orang biasa yang saling jatuh cinta."', {
      color: 'rgba(245,240,232,.55)', fontFamily: 'Georgia, serif', fontSize: '13.5px', fontStyle: 'italic',
      wordWrap: { width: 760, useAdvancedWrap: true }, align: 'center',
    }).setOrigin(0.5);
    group.add(quote);
  }

  /** Batang afinitas tumbuh pelan ala tinta (legacy). */
  private affinityBar(label: string, value: number, total: number, y: number, color: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const barX = GAME_WIDTH / 2 - 160;
    const labelText = this.add.text(GAME_WIDTH / 2 - 172, y + 4, label, {
      color: 'rgba(245,240,232,.85)', fontFamily: FONT.UI, fontSize: '13px',
    }).setOrigin(1, 0.5);
    const track = this.add.graphics();
    track.fillStyle(0xf5f0e8, 0.13);
    track.fillRoundedRect(barX, y - 9, 300, 17, 8);
    track.lineStyle(1.2, 0x16100a, 0.5);
    track.strokeRoundedRect(barX, y - 9, 300, 17, 8);
    const fillW = value > 0 ? Math.max(7, 300 * (value / total)) : 0;
    const fill = this.add.graphics();
    fill.fillStyle(color, 0.92);
    fill.fillRoundedRect(barX, y - 9, fillW, 17, 8);
    const count = this.add.text(barX + 8 + Math.min(fillW, 284), y + 3.5, String(value), {
      color: 'rgba(245,240,232,.75)', fontFamily: FONT.META, fontSize: '11px',
    }).setOrigin(0, 0.5);
    container.add([labelText, track, fill, count]);
    return container;
  }

  /** Partikel hati pink/emas naik (drawParts heart legacy, digambar via Graphics). */
  private spawnHeart(): void {
    const gfx = this.add.graphics();
    const pink = Math.random() < 0.6;
    const s = 2.4 + Math.random() * 2.6;
    const color = pink ? 0xf5c6d0 : 0xf1d58b;
    gfx.fillStyle(color, 0.8);
    gfx.fillCircle(-s * 0.5, -s * 0.35, s * 0.55);
    gfx.fillCircle(s * 0.5, -s * 0.35, s * 0.55);
    gfx.fillTriangle(-s * 1.02, -s * 0.1, s * 1.02, -s * 0.1, 0, s * 1.15);
    gfx.setPosition(60 + Math.random() * (GAME_WIDTH - 120), GAME_HEIGHT + 12);
    this.hearts.push({ gfx, vy: -(22 + Math.random() * 20), sway: Math.random() * 6.28, born: this.elapsed });
  }

  private goToTitle(): void {
    this.soundManager?.playSelect();
    this.scene.start('TitleScene');
  }
}
