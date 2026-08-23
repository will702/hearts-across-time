import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { normalizedAngleDistance } from '../minigames/math';
import type { RunState, SaveSystem } from '../systems/SaveSystem';
import type { UIScene } from './UIScene';

const START_ANGLES: [number, number, number] = [0.68, 0.08, 0.39];
const RADII = [124, 92, 60];

type WatchData = {
  run: RunState;
  save: SaveSystem;
  onComplete: () => void;
};

export class WatchRepairScene extends Phaser.Scene {
  private watchData!: WatchData;
  private soundManager?: SoundManager;
  private ring = 0;
  private angles = START_ANGLES.slice();
  private targets: [number, number, number] = [...START_ANGLES];
  private locked = [false, false, false];
  private misses = 0;
  private assisted = false;
  private complete = false;

  private rings: Phaser.GameObjects.Container[] = [];
  private targetMarkers: Phaser.GameObjects.Arc[] = [];
  private status?: Phaser.GameObjects.Text;
  private proximityText?: Phaser.GameObjects.Text;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  private isDragging = false;
  private lastDragAngle = 0;
  private lastTickAngle = 0;

  constructor() {
    super('WatchRepairScene');
  }

  create(data: WatchData): void {
    this.watchData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.targets = data.run.watchTargets ? [...data.run.watchTargets] : this.createTargets();
    data.run.watchTargets = [...this.targets];
    data.save.saveCycle('1944', data.run);
    this.registry.set('nativeState', 'watchrepair');

    (this.scene.get('UIScene') as UIScene).setModal(true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.scene.get('UIScene') as UIScene).setModal(false));

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x040302, 0.92);
    if (this.textures.exists('watch-repair-art')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'watch-repair-art')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.24);
    }

    this.add.text(GAME_WIDTH / 2, 36, 'PERBAIKI ARLOJI ARTHUR', {
      color: '#f7d984', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
      stroke: '#1a0f08', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 68, 'Selaraskan tiga roda gigi mekanik arloji satu per satu.', {
      color: '#f5f0e8', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    RADII.forEach((radius, index) => this.createRing(radius, index));

    this.status = this.add.text(GAME_WIDTH / 2, 396, 'RODA 1 / 3 — PUTAR DENGAN PANAH/A/D ATAU GESER LINGKARAN', {
      backgroundColor: '#100c09dd', color: '#fff4d1', fontFamily: 'Poppins, sans-serif',
      fontSize: '13px', padding: { x: 18, y: 9 },
    }).setOrigin(0.5);

    this.proximityText = this.add.text(GAME_WIDTH / 2, 428, '', {
      color: '#fbbf24', fontFamily: 'Poppins, sans-serif', fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.createTouchButtons();
    this.createInputHandlers();
    this.refreshRings();
  }

  update(_time: number, delta: number): void {
    if (!this.keys || this.complete) return;
    const direction = this.keys.left.isDown || this.keys.a.isDown ? -1 : this.keys.right.isDown || this.keys.d.isDown ? 1 : 0;
    if (direction) this.rotate(direction * delta / 1000 * (this.assisted ? 0.32 : 0.46));
    if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.lockCurrent();
  }

  snapshot(): Record<string, unknown> {
    return {
      watchRepair: {
        ring: this.ring,
        angles: this.angles,
        targets: this.targets,
        locked: this.locked,
        misses: this.misses,
        assisted: this.assisted,
        complete: this.complete,
      },
    };
  }

  private createRing(radius: number, index: number): void {
    const ringContainer = this.add.container(GAME_WIDTH / 2, 236);

    // Outer Gear Body Graphics
    const gearGraphics = this.add.graphics();
    const toothCount = 12 + index * 4;
    gearGraphics.lineStyle(index === 0 ? 6 : 4, index === 0 ? 0xf7d984 : (index === 1 ? 0xd4a373 : 0x946b43), 0.95);
    gearGraphics.strokeCircle(0, 0, radius);

    // Draw Cogs / Teeth
    gearGraphics.fillStyle(index === 0 ? 0xfde047 : 0xb88a55, 0.85);
    for (let i = 0; i < toothCount; i++) {
      const ang = (i / toothCount) * Math.PI * 2;
      const tx = Math.cos(ang) * radius;
      const ty = Math.sin(ang) * radius;
      gearGraphics.fillCircle(tx, ty, index === 0 ? 3.5 : 2.5);
    }

    // Alignment Pointer
    const pointer = this.add.rectangle(0, -radius + 8, index === 0 ? 8 : 6, 24, 0x38bdf8).setOrigin(0.5, 1);
    ringContainer.add([gearGraphics, pointer]);

    // Target Slot Marker
    const target = this.targets[index] * Math.PI * 2;
    const marker = this.add.arc(
      GAME_WIDTH / 2 + Math.sin(target) * radius,
      236 - Math.cos(target) * radius,
      7,
      0,
      360,
      false,
      0x22c55e,
      0.65,
    ).setStrokeStyle(2, 0x86efac, 0.9);

    this.rings.push(ringContainer);
    this.targetMarkers.push(marker);
  }

  private createTouchButtons(): void {
    const button = (x: number, label: string, action: () => void): void => {
      this.add.text(x, 478, label, {
        backgroundColor: '#1a1510dd', color: '#fff8ea', fontFamily: 'Poppins, sans-serif',
        fontSize: '13px', padding: { x: 18, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', action);
    };
    button(310, '◀ PUTAR KIRI', () => this.rotate(-0.04));
    button(480, 'KUNCI GIGI', () => this.lockCurrent());
    button(650, 'PUTAR KANAN ▶', () => this.rotate(0.04));
  }

  private createInputHandlers(): void {
    this.keys = this.input.keyboard?.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    // Direct circular pointer drag
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.complete) return;
      const dx = pointer.x - GAME_WIDTH / 2;
      const dy = pointer.y - 236;
      const dist = Math.hypot(dx, dy);
      if (dist >= 30 && dist <= 160) {
        this.isDragging = true;
        this.lastDragAngle = Math.atan2(dy, dx);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.complete) return;
      const dx = pointer.x - GAME_WIDTH / 2;
      const dy = pointer.y - 236;
      const curAngle = Math.atan2(dy, dx);
      let diff = curAngle - this.lastDragAngle;
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      this.lastDragAngle = curAngle;
      this.rotate(diff / (Math.PI * 2));
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
  }

  private rotate(amount: number): void {
    if (this.complete) return;
    this.angles[this.ring] = (this.angles[this.ring] + amount + 1) % 1;

    // Trigger tick sound on angular steps
    if (Math.abs(this.angles[this.ring] - this.lastTickAngle) > 0.04) {
      this.lastTickAngle = this.angles[this.ring];
      this.soundManager?.playGearTick(0.9 + this.ring * 0.2);
    }

    this.refreshRings();
  }

  private lockCurrent(): void {
    if (this.complete) return;
    const angle = this.angles[this.ring];
    const target = this.targets[this.ring];
    const distance = normalizedAngleDistance(angle, target);
    const tolerance = this.assisted ? 0.12 : 0.065;

    if (distance <= tolerance) {
      this.locked[this.ring] = true;
      this.soundManager?.playLockSuccess();
      this.emitSparks(this.ring);

      this.ring += 1;
      if (this.ring === 3) {
        this.complete = true;
        this.watchData.run.watchRepaired = true;
        this.watchData.run.inventory.watch = 1;
        this.watchData.save.saveCycle('1944', this.watchData.run, 478);
        this.status?.setText('ARLOJI ARTHUR KEMBALI BERDETAK!').setColor('#86efac');
        this.proximityText?.setText('SEMUA RODA GIGI SELARAS SEMPURNA').setColor('#a3e635');
        this.soundManager?.playSuccessFanfare();
        this.time.delayedCall(950, () => {
          this.watchData.onComplete();
          this.scene.stop();
        });
      } else {
        this.status?.setText(`RODA ${this.ring + 1} / 3 — SELARASKAN GIGI BERIKUTNYA`);
      }
    } else {
      this.misses += 1;
      this.assisted = this.misses >= 3;
      this.soundManager?.playErrorBuzz();
      this.status?.setText(this.assisted ? 'GIGI BELUM SELARAS — MODE BANTUAN AKTIF' : 'GIGI RODA BELUM SELARAS DENGAN INDIKATOR HIJAU');
      if (!this.registry.get('reduceMotion')) {
        this.cameras.main.shake(140, 0.005);
      }
    }
    this.refreshRings();
  }

  private refreshRings(): void {
    this.rings.forEach((ring, index) => {
      ring.setRotation(this.angles[index] * Math.PI * 2);
      ring.setAlpha(index === this.ring || this.locked[index] ? 1 : 0.45);
      if (this.locked[index]) ring.setScale(0.98);
    });

    if (this.ring < 3) {
      const dist = normalizedAngleDistance(this.angles[this.ring], this.targets[this.ring]);
      const proximity = Math.max(0, 1 - dist / 0.25);
      const marker = this.targetMarkers[this.ring];
      if (marker) {
        marker.setScale(1 + proximity * 0.4);
        marker.setAlpha(0.6 + proximity * 0.4);
      }
      if (dist <= (this.assisted ? 0.12 : 0.065)) {
        this.proximityText?.setText('✦ ZONA SELARAS — TEKAN SPACE / KUNCI ✦').setColor('#86efac');
      } else {
        this.proximityText?.setText(`DEVIASI: ${Math.round(dist * 360)}°`).setColor('#fde047');
      }
    }
  }

  private emitSparks(ringIdx: number): void {
    if (this.registry.get('reduceMotion')) return;
    const radius = RADII[ringIdx];
    const target = this.targets[ringIdx] * Math.PI * 2;
    const sx = GAME_WIDTH / 2 + Math.sin(target) * radius;
    const sy = 236 - Math.cos(target) * radius;

    for (let i = 0; i < 14; i++) {
      const spark = this.add.circle(sx, sy, Phaser.Math.Between(2, 4), 0xfef08a);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(40, 120);
      this.tweens.add({
        targets: spark,
        x: sx + Math.cos(angle) * speed,
        y: sy + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 450,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private createTargets(): [number, number, number] {
    return START_ANGLES.map((start) => {
      let value = start;
      for (let attempt = 0; attempt < 12 && Math.min(Math.abs(value - start), 1 - Math.abs(value - start)) < 0.16; attempt += 1) {
        value = Math.round((0.05 + Math.random() * 0.90) * 48) / 48;
      }
      return value;
    }) as [number, number, number];
  }
}
