import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { RunState, SaveSystem } from '../systems/SaveSystem';
import type { UIScene } from './UIScene';

const START_ANGLES: [number, number, number] = [0.68, 0.08, 0.39];

type WatchData = {
  run: RunState;
  save: SaveSystem;
  onComplete: () => void;
};

export class WatchRepairScene extends Phaser.Scene {
  private watchData!: WatchData;
  private ring = 0;
  private angles = START_ANGLES.slice();
  private targets: [number, number, number] = [...START_ANGLES];
  private locked = [false, false, false];
  private misses = 0;
  private assisted = false;
  private complete = false;
  private rings: Phaser.GameObjects.Container[] = [];
  private status?: Phaser.GameObjects.Text;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('WatchRepairScene');
  }

  create(data: WatchData): void {
    this.watchData = data;
    this.targets = data.run.watchTargets ? [...data.run.watchTargets] : this.createTargets();
    data.run.watchTargets = [...this.targets];
    data.save.saveCycle('1944', data.run);
    this.registry.set('nativeState', 'watchrepair');
    (this.scene.get('UIScene') as UIScene).setModal(true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.scene.get('UIScene') as UIScene).setModal(false));

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x030303, 0.9);
    if (this.textures.exists('watch-repair-art')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'watch-repair-art')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.23);
    }
    this.add.text(GAME_WIDTH / 2, 38, 'PERBAIKI ARLOJI ARTHUR', {
      color: '#f7d984', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
      stroke: '#1a0f08', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 70, 'Selaraskan tiga roda gigi, satu per satu.', {
      color: '#f5f0e8', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    [118, 88, 58].forEach((radius, index) => this.createRing(radius, index));
    this.status = this.add.text(GAME_WIDTH / 2, 398, 'RODA 1 / 3', {
      backgroundColor: '#100c09dd', color: '#fff4d1', fontFamily: 'Poppins, sans-serif',
      fontSize: '13px', padding: { x: 18, y: 9 },
    }).setOrigin(0.5);
    this.createTouchButtons();
    this.keys = this.input.keyboard?.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.refreshRings();
  }

  update(_time: number, delta: number): void {
    if (!this.keys || this.complete) return;
    const direction = this.keys.left.isDown || this.keys.a.isDown ? -1 : this.keys.right.isDown || this.keys.d.isDown ? 1 : 0;
    if (direction) this.rotate(direction * delta / 1000 * (this.assisted ? 0.28 : 0.42));
    if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.lockCurrent();
  }

  snapshot(): Record<string, unknown> {
    return { watchRepair: { ring: this.ring, angles: this.angles, locked: this.locked, assisted: this.assisted } };
  }

  private createRing(radius: number, index: number): void {
    const ring = this.add.container(GAME_WIDTH / 2, 244);
    const circle = this.add.arc(0, 0, radius, 0, 360, false, 0x2b211a, 0.35)
      .setStrokeStyle(index === 0 ? 7 : 5, index === 0 ? 0xf7d984 : 0xb88a55, 0.95);
    const pointer = this.add.rectangle(0, -radius + 8, index === 0 ? 8 : 6, 26, 0x69d7dd).setOrigin(0.5, 1);
    ring.add([circle, pointer]);
    const target = this.targets[index] * Math.PI * 2;
    this.add.rectangle(
      GAME_WIDTH / 2 + Math.sin(target) * radius,
      244 - Math.cos(target) * radius,
      8,
      8,
      0xffe9a3,
      0.75,
    ).setRotation(target);
    this.rings.push(ring);
  }

  private createTouchButtons(): void {
    const button = (x: number, label: string, action: () => void): void => {
      this.add.text(x, 466, label, {
        backgroundColor: '#1a1510dd', color: '#fff8ea', fontFamily: 'Poppins, sans-serif',
        fontSize: '14px', padding: { x: 20, y: 13 },
      }).setOrigin(0.5).setInteractive().on('pointerdown', action);
    };
    button(332, '◀ PUTAR', () => this.rotate(-0.035));
    button(480, 'KUNCI', () => this.lockCurrent());
    button(628, 'PUTAR ▶', () => this.rotate(0.035));
  }

  private rotate(amount: number): void {
    if (this.complete) return;
    this.angles[this.ring] = (this.angles[this.ring] + amount + 1) % 1;
    this.refreshRings();
  }

  private lockCurrent(): void {
    if (this.complete) return;
    const angle = this.angles[this.ring];
    const target = this.targets[this.ring];
    const distance = Math.min(Math.abs(angle - target), 1 - Math.abs(angle - target));
    if (distance <= (this.assisted ? 0.11 : 0.06)) {
      this.locked[this.ring] = true;
      this.ring += 1;
      if (this.ring === 3) {
        this.complete = true;
        this.watchData.run.watchRepaired = true;
        this.watchData.run.inventory.watch = 1;
        this.watchData.save.saveCycle('1944', this.watchData.run, 478);
        this.status?.setText('ARLOJI KEMBALI BERDETAK').setColor('#bfe0c7');
        this.time.delayedCall(750, () => { this.watchData.onComplete(); this.scene.stop(); });
      } else {
        this.status?.setText(`RODA ${this.ring + 1} / 3`);
      }
    } else {
      this.misses += 1;
      this.assisted = this.misses >= 3;
      this.status?.setText(this.assisted ? 'GIGI BELUM SELARAS — BANTUAN AKTIF' : 'GIGI RODA BELUM SELARAS');
      if (!this.registry.get('reduceMotion')) this.cameras.main.shake(120, 0.004);
    }
    this.refreshRings();
  }

  private refreshRings(): void {
    this.rings.forEach((ring, index) => {
      ring.setRotation(this.angles[index] * Math.PI * 2);
      ring.setAlpha(index === this.ring || this.locked[index] ? 1 : 0.5);
      if (this.locked[index]) ring.setScale(0.98);
    });
  }

  private createTargets(): [number, number, number] {
    return START_ANGLES.map((start) => {
      let value = start;
      for (let attempt = 0; attempt < 12 && Math.min(Math.abs(value - start), 1 - Math.abs(value - start)) < 0.14; attempt += 1) {
        value = Math.round((0.04 + Math.random() * 0.92) * 48) / 48;
      }
      return value;
    }) as [number, number, number];
  }
}
