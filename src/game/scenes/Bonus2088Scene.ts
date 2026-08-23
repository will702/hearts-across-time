import Phaser from 'phaser';
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
    }).setOrigin(0.5).setScrollFactor(0).setInteractive().on('pointerup', () => this.scene.start('TitleScene'));
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

    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020104, 0.9).setScrollFactor(0);
    const box = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 720, 420, 0x180f24, 0.98).setStrokeStyle(2, 0xd946ef).setScrollFactor(0);

    const title = this.add.text(GAME_WIDTH / 2, 90, BONUS_NODES[idx].label, {
      color: '#fdf4ff', fontFamily: 'Cinzel, serif', fontSize: '20px', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);

    let descText = 'Selesaikan mini-game ini untuk mengumpulkan kenangan Arthur & Elena.';
    if (idx === 0) descText = 'Cari 10 perbedaan di antara kedua panel ilustrasi kenangan.';
    if (idx === 1) descText = 'Buket Mawar Abadi & kode angka rahasia masa depan: 2088.';
    if (idx === 2) descText = 'Susun tempat duduk 4 orang (Adi, Budi, Citra, Dina) dan 4 menu makanan.';
    if (idx === 3) descText = 'Hitung seluruh 18 kucing peliharaan Arthur di dalam ilustrasi.';
    if (idx === 4) descText = 'Racik Ramuan Cinta: masukkan Jam Arloji -> Gelas Mawar -> Permata Air.';

    const desc = this.add.text(GAME_WIDTH / 2, 170, descText, {
      color: '#f5d0fe', fontFamily: 'Patrick Hand, sans-serif', fontSize: '20px', align: 'center', wordWrap: { width: 620 },
    }).setOrigin(0.5).setScrollFactor(0);

    const completeBtn = this.add.text(GAME_WIDTH / 2, 330, 'SELESAIKAN SIMPUL INI', {
      backgroundColor: '#a21cafdd', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '14px', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setInteractive().on('pointerup', () => {
      this.litNodes[idx] = true;
      this.closeModal();
    });

    const closeBtn = this.add.text(GAME_WIDTH / 2, 385, 'TUTUP', {
      color: '#e9d5ff', fontFamily: 'Poppins, sans-serif', fontSize: '12px',
    }).setOrigin(0.5).setScrollFactor(0).setInteractive().on('pointerup', () => this.closeModal());

    this.activeModal = this.add.container(0, 0, [shade, box, title, desc, completeBtn, closeBtn]);
  }

  private closeModal(): void {
    this.activeModal?.destroy();
    this.activeModal = undefined;
    this.controls.setEnabled(true);
  }

  private finishBonusEpilogue(): void {
    this.save.data.bonusSeen = true;
    this.save.save(this.save.data);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050208, 1).setScrollFactor(0);
    this.add.text(GAME_WIDTH / 2, 180, 'HEARTS ACROSS TIME • EPILOG LENGKAP', {
      color: '#f6d57b', fontFamily: 'Cinzel, serif', fontSize: '26px', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);

    this.add.text(GAME_WIDTH / 2, 260, 'Seluruh kenangan, cinta, dan penantian 55 tahun telah abadi.\nTerima kasih telah mematahkan lingkaran waktu.', {
      color: '#fdf4ff', fontFamily: 'Patrick Hand, sans-serif', fontSize: '22px', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setScrollFactor(0);

    this.add.text(GAME_WIDTH / 2, 380, 'KEMBALI KE MENU UTAMA (ENTER / SPACE)', {
      backgroundColor: '#94342edd', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '13px', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setInteractive().on('pointerup', () => this.scene.start('TitleScene'));

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('TitleScene'));
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('TitleScene'));
  }
}
