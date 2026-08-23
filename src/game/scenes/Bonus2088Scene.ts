import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Player } from '../entities/Player';
import { InputSystem } from '../systems/InputSystem';
import type { SaveSystem } from '../systems/SaveSystem';

const BONUS_NODES = [
  { x: 150, label: '1. TEMUKAN PERBEDAAN' },
  { x: 365, label: '2. BUKET MAWAR & KODE' },
  { x: 580, label: '3. MEJA MAKAN MALAM' },
  { x: 795, label: '4. HITUNG KUCING' },
  { x: 1010, label: '5. GELAS CINTA KIMIA' },
];

export class Bonus2088Scene extends Phaser.Scene {
  private save!: SaveSystem;
  private soundManager?: SoundManager;
  private player!: Player;
  private controls!: InputSystem;
  private litNodes: Record<number, boolean> = {};
  private promptText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private activeModal?: Phaser.GameObjects.Container;

  constructor() {
    super('Bonus2088Scene');
  }

  create(): void {
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'bonus2088');
    this.litNodes = {};

    const WORLD_WIDTH = 1220;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    this.createWorldLayers(WORLD_WIDTH);

    this.player = new Player(this, 72, 444, {
      reduceMotion: Boolean(this.registry.get('reduceMotion')),
      surfaceAt: () => 'metal',
    });

    this.controls = new InputSystem(this);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.12);

    this.promptText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '', {
      backgroundColor: '#0c0a0edd', color: '#fef08a', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false);

    this.statusText = this.add.text(20, 20, 'EPILOG 2088 — 5 SIMPUL KENANGAN ARTHUR & ELENA', {
      color: '#f6d57b', fontFamily: 'Cinzel, serif', fontSize: '15px', fontStyle: 'bold',
    }).setScrollFactor(0);

    this.add.text(GAME_WIDTH - 120, 24, 'MENU UTAMA', {
      backgroundColor: '#450a0add', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '11px', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('TitleScene'));
  }

  update(_time: number, delta: number): void {
    if (this.activeModal) return;

    const input = this.controls.read();
    this.player.updatePlayer(input, delta);

    const px = this.player.x;
    let nearNode = -1;
    BONUS_NODES.forEach((node, idx) => {
      if (Math.abs(px - node.x) < 55) nearNode = idx;
    });

    if (nearNode >= 0) {
      const isLit = this.litNodes[nearNode];
      this.promptText?.setText(isLit ? `[SELESAI] ${BONUS_NODES[nearNode].label}` : `SPACE — BUKA ${BONUS_NODES[nearNode].label}`).setVisible(true);

      if (!isLit && input.interact) {
        this.openBonusNode(nearNode);
      }
    } else if (px > 1130 && Object.keys(this.litNodes).length >= 5) {
      this.promptText?.setText('SPACE — SELESAIKAN EPILOG 2088').setVisible(true);
      if (input.interact) {
        this.finishBonusEpilogue();
      }
    } else {
      this.promptText?.setVisible(false);
    }
  }

  private createWorldLayers(worldWidth: number): void {
    this.add.rectangle(worldWidth / 2, GAME_HEIGHT / 2, worldWidth, GAME_HEIGHT, 0x090510).setDepth(-30);

    if (this.textures.exists('bg2088-far')) {
      this.add.image(0, 92, 'bg2088-far').setOrigin(0).setScale(0.75).setScrollFactor(0.14).setDepth(-25);
    }
    if (this.textures.exists('bg2088-near')) {
      this.add.image(0, -312, 'bg2088-near').setOrigin(0).setScale(0.75).setScrollFactor(0.45).setDepth(-20);
    }

    BONUS_NODES.forEach((node, idx) => {
      this.add.rectangle(node.x, 444, 40, 60, 0x4a044e).setOrigin(0.5, 1).setStrokeStyle(2, 0xd946ef);
      this.add.text(node.x, 370, `${idx + 1}`, {
        color: '#fdf4ff', fontFamily: 'Cinzel, serif', fontSize: '16px', fontStyle: 'bold',
      }).setOrigin(0.5);
    });

    if (this.textures.exists('bg2088-fg')) {
      this.add.image(0, 412, 'bg2088-fg').setOrigin(0).setDisplaySize(worldWidth, 150).setDepth(1000);
    }
  }

  private openBonusNode(idx: number): void {
    this.controls.setEnabled(false);
    this.player.arcadeBody.setVelocityX(0);
    this.soundManager?.playSelect();

    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020104, 0.9).setScrollFactor(0);
    const box = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 740, 430, 0x180f24, 0.98).setStrokeStyle(2, 0xd946ef).setScrollFactor(0);

    const title = this.add.text(GAME_WIDTH / 2, 80, BONUS_NODES[idx].label, {
      color: '#fdf4ff', fontFamily: 'Cinzel, serif', fontSize: '20px', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);

    const elements: Phaser.GameObjects.GameObject[] = [shade, box, title];

    if (idx === 0) {
      this.buildSpotDiffGame(elements);
    } else if (idx === 1) {
      this.buildKeypadGame(elements);
    } else if (idx === 2) {
      this.buildSeatingGame(elements);
    } else if (idx === 3) {
      this.buildCatCounterGame(elements);
    } else {
      this.buildPotionMixingGame(elements);
    }

    const closeBtn = this.add.text(GAME_WIDTH / 2, 450, 'TUTUP / KELUAR', {
      color: '#e9d5ff', fontFamily: 'Poppins, sans-serif', fontSize: '12px',
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true }).on('pointerup', () => this.closeModal());

    elements.push(closeBtn);
    this.activeModal = this.add.container(0, 0, elements);
  }

  // Mini-game 1: Spot 3 differences
  private buildSpotDiffGame(elements: Phaser.GameObjects.GameObject[]): void {
    const desc = this.add.text(GAME_WIDTH / 2, 115, 'Temukan 3 titik perbedaan di antara kedua panel kenangan Arthur & Elena:', {
      color: '#f5d0fe', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5).setScrollFactor(0);
    elements.push(desc);

    const spotsFound = [false, false, false];
    const status = this.add.text(GAME_WIDTH / 2, 385, 'DITEMUKAN: 0 / 3', {
      color: '#fde047', fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);
    elements.push(status);

    const diffs = [
      { x: 340, y: 200, label: 'Arloji Emas' },
      { x: 480, y: 260, label: 'Mawar Abadi' },
      { x: 620, y: 210, label: 'Vial Permata' },
    ];

    diffs.forEach((d, i) => {
      const spot = this.add.circle(d.x, d.y, 28, 0xd946ef, 0.25).setScrollFactor(0).setStrokeStyle(2, 0xf0abfc)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(d.x, d.y, `?`, { color: '#fff', fontSize: '16px', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0);

      spot.on('pointerup', () => {
        if (!spotsFound[i]) {
          spotsFound[i] = true;
          spot.setFillStyle(0x22c55e, 0.75).setStrokeStyle(2, 0x86efac);
          txt.setText('✓');
          this.soundManager?.playLockSuccess();
          const count = spotsFound.filter(Boolean).length;
          status.setText(`DITEMUKAN: ${count} / 3`);
          if (count === 3) {
            this.soundManager?.playSuccessFanfare();
            status.setText('SEMUA PERBEDAAN DITEMUKAN! SIMPUL 1 LENGKAP').setColor('#86efac');
            this.time.delayedCall(700, () => {
              this.litNodes[0] = true;
              this.closeModal();
            });
          }
        }
      });

      elements.push(spot, txt);
    });
  }

  // Mini-game 2: Passcode 2088
  private buildKeypadGame(elements: Phaser.GameObjects.GameObject[]): void {
    const desc = this.add.text(GAME_WIDTH / 2, 115, 'Masukkan 4 digit kode tahun masa depan Arthur & Elena:', {
      color: '#f5d0fe', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5).setScrollFactor(0);
    elements.push(desc);

    let code = '';
    const display = this.add.text(GAME_WIDTH / 2, 160, '____', {
      color: '#fde047', fontFamily: 'Cinzel, serif', fontSize: '32px', fontStyle: 'bold', letterSpacing: 8,
    }).setOrigin(0.5).setScrollFactor(0);
    elements.push(display);

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];
    keys.forEach((k, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const kx = GAME_WIDTH / 2 - 90 + col * 90;
      const ky = 215 + row * 45;

      const btn = this.add.rectangle(kx, ky, 75, 36, 0x3b0764, 0.9).setStrokeStyle(2, 0xd946ef).setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(kx, ky, k, { color: '#fdf4ff', fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0);

      btn.on('pointerup', () => {
        if (k === 'C') {
          code = '';
          this.soundManager?.playSelect();
        } else if (k === 'OK') {
          if (code === '2088') {
            this.soundManager?.playSuccessFanfare();
            display.setText('2088 ✓').setColor('#86efac');
            this.time.delayedCall(700, () => {
              this.litNodes[1] = true;
              this.closeModal();
            });
          } else {
            this.soundManager?.playErrorBuzz();
            display.setText('SALAH!').setColor('#f87171');
            this.time.delayedCall(600, () => { code = ''; display.setText('____').setColor('#fde047'); });
          }
        } else if (code.length < 4) {
          code += k;
          this.soundManager?.playGearTick(1.2);
        }
        if (k !== 'OK' && k !== 'C') {
          display.setText(code.padEnd(4, '_'));
        }
      });

      elements.push(btn, txt);
    });
  }

  // Mini-game 3: Dinner seating logic
  private buildSeatingGame(elements: Phaser.GameObjects.GameObject[]): void {
    const desc = this.add.text(GAME_WIDTH / 2, 115, 'Susun 4 sahabat di meja makan: Arthur, Elena, Leo, Mira', {
      color: '#f5d0fe', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5).setScrollFactor(0);
    elements.push(desc);

    const seats = ['Kiri Atas: Arthur', 'Kanan Atas: Elena', 'Kiri Bawah: Leo', 'Kanan Bawah: Mira'];
    const confirmed = [false, false, false, false];

    seats.forEach((seat, i) => {
      const sx = GAME_WIDTH / 2 + (i % 2 === 0 ? -150 : 150);
      const sy = 190 + Math.floor(i / 2) * 80;

      const btn = this.add.rectangle(sx, sy, 220, 50, 0x3b0764, 0.9).setStrokeStyle(2, 0xd946ef).setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(sx, sy, `🪑 ${seat}`, { color: '#fdf4ff', fontFamily: 'Poppins, sans-serif', fontSize: '13px' }).setOrigin(0.5).setScrollFactor(0);

      btn.on('pointerup', () => {
        if (!confirmed[i]) {
          confirmed[i] = true;
          btn.setFillStyle(0x15803d, 0.9).setStrokeStyle(2, 0x86efac);
          this.soundManager?.playLockSuccess();
          if (confirmed.every(Boolean)) {
            this.soundManager?.playSuccessFanfare();
            this.time.delayedCall(700, () => {
              this.litNodes[2] = true;
              this.closeModal();
            });
          }
        }
      });

      elements.push(btn, txt);
    });
  }

  // Mini-game 4: Count Cats
  private buildCatCounterGame(elements: Phaser.GameObjects.GameObject[]): void {
    const desc = this.add.text(GAME_WIDTH / 2, 115, 'Temukan dan sentuh 4 kucing peliharaan di kamar Arthur 2088:', {
      color: '#f5d0fe', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5).setScrollFactor(0);
    elements.push(desc);

    const catsFound = [false, false, false, false];
    const catPositions = [
      { x: 260, y: 220, name: '🐱 Kucing Belang' },
      { x: 420, y: 300, name: '🐱 Kucing Oranye' },
      { x: 540, y: 210, name: '🐱 Kucing Hitam' },
      { x: 700, y: 290, name: '🐱 Kucing Putih' },
    ];

    const status = this.add.text(GAME_WIDTH / 2, 385, 'KUCING DITEMUKAN: 0 / 4', {
      color: '#fde047', fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);
    elements.push(status);

    catPositions.forEach((c, i) => {
      const btn = this.add.rectangle(c.x, c.y, 110, 44, 0x4a044e, 0.9).setStrokeStyle(2, 0xf472b6).setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(c.x, c.y, c.name, { color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '11px' }).setOrigin(0.5).setScrollFactor(0);

      btn.on('pointerup', () => {
        if (!catsFound[i]) {
          catsFound[i] = true;
          btn.setFillStyle(0x15803d, 0.9).setStrokeStyle(2, 0x86efac);
          this.soundManager?.playLockSuccess();
          const count = catsFound.filter(Boolean).length;
          status.setText(`KUCING DITEMUKAN: ${count} / 4`);
          if (count === 4) {
            this.soundManager?.playSuccessFanfare();
            status.setText('SEMUA 4 KUCING DITEMUKAN!').setColor('#86efac');
            this.time.delayedCall(700, () => {
              this.litNodes[3] = true;
              this.closeModal();
            });
          }
        }
      });

      elements.push(btn, txt);
    });
  }

  // Mini-game 5: Alchemy Potion Mixing Sequence
  private buildPotionMixingGame(elements: Phaser.GameObjects.GameObject[]): void {
    const desc = this.add.text(GAME_WIDTH / 2, 115, 'Masukkan 3 elemen obat penawar sesuai urutan garis waktu:\n1944 (Arloji) → 1968 (Mawar) → 1999 (Permata)', {
      color: '#f5d0fe', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0);
    elements.push(desc);

    const expectedOrder = [0, 1, 2];
    const currentOrder: number[] = [];

    const items = [
      { name: '⏱️ 1. Arloji Arthur 1944', x: 260, y: 260 },
      { name: '🌹 2. Mawar Abadi 1968', x: 480, y: 260 },
      { name: '💎 3. Permata Air 1999', x: 700, y: 260 },
    ];

    const status = this.add.text(GAME_WIDTH / 2, 385, 'URUTAN: MASUKKAN ELEMEN 1', {
      color: '#fde047', fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);
    elements.push(status);

    items.forEach((item, idx) => {
      const btn = this.add.rectangle(item.x, item.y, 180, 60, 0x3b0764, 0.9).setStrokeStyle(2, 0xd946ef).setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(item.x, item.y, item.name, { color: '#fdf4ff', fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0);

      btn.on('pointerup', () => {
        if (expectedOrder[currentOrder.length] === idx) {
          currentOrder.push(idx);
          btn.setFillStyle(0x15803d, 0.9).setStrokeStyle(2, 0x86efac);
          this.soundManager?.playWaterShimmer();
          status.setText(`URUTAN ${currentOrder.length} / 3 BENAR!`).setColor('#86efac');

          if (currentOrder.length === 3) {
            this.soundManager?.playSuccessFanfare();
            status.setText('RAMUAN PENAWAR WAKTU BERHASIL DIRACIK!').setColor('#a3e635');
            this.time.delayedCall(700, () => {
              this.litNodes[4] = true;
              this.closeModal();
            });
          }
        } else {
          this.soundManager?.playErrorBuzz();
          status.setText('URUTAN SALAH! MULAI DARI 1944').setColor('#f87171');
          currentOrder.length = 0;
        }
      });

      elements.push(btn, txt);
    });
  }

  private closeModal(): void {
    this.activeModal?.destroy();
    this.activeModal = undefined;
    this.controls.setEnabled(true);
  }

  private finishBonusEpilogue(): void {
    this.save.data.bonusSeen = true;
    this.save.save(this.save.data);
    this.soundManager?.playSuccessFanfare();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050208, 1).setScrollFactor(0);
    this.add.text(GAME_WIDTH / 2, 180, 'HEARTS ACROSS TIME • EPILOG LENGKAP', {
      color: '#f6d57b', fontFamily: 'Cinzel, serif', fontSize: '26px', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);

    this.add.text(GAME_WIDTH / 2, 260, 'Seluruh kenangan, cinta, dan penantian 55 tahun telah abadi.\nTerima kasih telah mematahkan lingkaran waktu.', {
      color: '#fdf4ff', fontFamily: 'Patrick Hand, sans-serif', fontSize: '22px', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setScrollFactor(0);

    this.add.text(GAME_WIDTH / 2, 380, 'KEMBALI KE MENU UTAMA (ENTER / SPACE)', {
      backgroundColor: '#94342edd', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '13px', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('TitleScene'));

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('TitleScene'));
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('TitleScene'));
  }
}
