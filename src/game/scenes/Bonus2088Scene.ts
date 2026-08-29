import Phaser from 'phaser';
import { BONUS_IMAGE_ASSETS, BONUS_PROP_SHEET_ASSETS } from '../assetManifest';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Player } from '../entities/Player';
import {
  CAT_SPOTS,
  CHEMISTRY_ORDER,
  DIFFERENCE_SPOTS,
  DINNER_FOODS,
  DINNER_PEOPLE,
  advanceChemistry,
  findCatAt,
  findDifferenceAt,
  isBonusCode,
  isDinnerValid,
  type ChemistryItem,
  type DinnerFood,
  type DinnerPerson,
} from '../minigames/bonusRules';
import { InputSystem } from '../systems/InputSystem';
import type { SaveSystem } from '../systems/SaveSystem';
import { addPaperPanel } from '../ui/paper';
import {
  CSS,
  FONT,
  GOLD,
  GOLD_BRIGHT,
  GREEN,
  GREEN_BRIGHT,
  RED,
  RED_BRIGHT,
  RED_DARK,
} from '../ui/theme';
import type { UIScene } from './UIScene';

type DisplayRect = { x: number; y: number; width: number; height: number };

const WORLD_WIDTH = 1220;

/* Palet epilog 2088: malam hangat + batu + emas kenangan (bukan neon). */
const NIGHT = 0x0d0a08;
const STONE = 0x2a2622;
const STONE_INK = 0x6a5b4b;
const BONUS_NODES = [
  { x: 150, label: '1. TEMUKAN PERBEDAAN' },
  { x: 365, label: '2. BUKET MAWAR & KODE' },
  { x: 580, label: '3. MEJA MAKAN MALAM' },
  { x: 795, label: '4. TEMUKAN 18 KUCING' },
  { x: 1010, label: '5. GELAS CINTA KIMIA' },
] as const;

const BONUS_REWARDS = [
  { label: 'ARLOJI' },
  { label: 'BUNGA MAWAR' },
  { label: 'DAFTAR MAKAN MALAM' },
  { label: 'KUCING PELIHARAAN ARTHUR' },
  { label: 'RAMUAN CINTA' },
] as const;

const DIFFERENCE_RECT: DisplayRect = { x: 40, y: 62, width: 880, height: 400 };
const CAT_RECT: DisplayRect = { x: 135, y: 68, width: 690, height: 386 };
const ROSE_RECT: DisplayRect = { x: 105, y: 68, width: 750, height: 380 };
const ROSE_SOURCE_SIZE = { width: 960, height: 540 };
const ROSE_HOMES = [
  [160, 180], [190, 320], [770, 180], [740, 320], [480, 380],
] as const;
const ROSE_TARGET = [480, 250] as const;

const FOOD_LABELS: Record<DinnerFood, string> = {
  steak: 'Steak',
  spaghetti: 'Spaghetti',
  udang: 'Udang keju',
  nasi: 'Nasi goreng',
};

const CHEMISTRY_ITEMS: ReadonlyArray<{
  id: ChemistryItem;
  label: string;
  era: string;
  texture: string;
}> = [
    { id: 'rose', label: 'Mawar abadi', era: '1968', texture: 'rose-bottle-broken' },
    { id: 'watch', label: 'Arloji Arthur', era: '1944', texture: 'watch-repair-art' },
    { id: 'gem', label: 'Permata air', era: '1999', texture: 'water-gem-art' },
  ];

export class Bonus2088Scene extends Phaser.Scene {
  private save!: SaveSystem;
  private soundManager?: SoundManager;
  private player!: Player;
  private controls!: InputSystem;
  private ui!: UIScene;
  private litNodes: Record<number, boolean> = {};
  private nodeLights: Phaser.GameObjects.Rectangle[] = [];
  private statusText?: Phaser.GameObjects.Text;
  private activeModal?: Phaser.GameObjects.Container;
  private modalCloseBtn?: Phaser.GameObjects.Rectangle;
  private modalCloseTxt?: Phaser.GameObjects.Text;
  private endingOverlay?: Phaser.GameObjects.Container;
  private modalCleanups: Array<() => void> = [];
  private ending = false;
  private activeNode = -1;
  private rewards: number[] = [];

  // Draf mini-game sengaja tinggal di scene agar menutup modal tidak menghapus kemajuan.
  private differenceFound = Array<boolean>(DIFFERENCE_SPOTS.length).fill(false);
  private roseCollected = Array<boolean>(ROSE_HOMES.length).fill(false);
  private roseCode = '';
  private dinnerPeople: Array<DinnerPerson | null> = [null, null, null, null];
  private dinnerFoods: Array<DinnerFood | null> = [null, null, null, null];
  private dinnerFocusSeat = 0;
  private dinnerMessage = 'Pilih kursi, lalu tempatkan satu orang dan satu hidangan.';
  private catFound = Array<boolean>(CAT_SPOTS.length).fill(false);
  private chemistryOrder: ChemistryItem[] = [];

  constructor() {
    super('Bonus2088Scene');
  }

  preload(): void {
    Object.entries(BONUS_IMAGE_ASSETS).forEach(([key, url]) => {
      if (!this.textures.exists(key)) this.load.image(key, url);
    });
    Object.entries(BONUS_PROP_SHEET_ASSETS).forEach(([key, url]) => {
      if (!this.textures.exists(key)) this.load.spritesheet(key, url, { frameWidth: 200, frameHeight: 200 });
    });

    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'MEMUAT KENANGAN 2088…', {
      color: CSS.gold, fontFamily: FONT.META, fontSize: '14px', letterSpacing: 2,
    }).setOrigin(0.5).setName('bonus-loader');
    this.load.once('complete', () => label.destroy());
  }

  create(): void {
    this.children.getByName('bonus-loader')?.destroy();
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'bonus2088');
    this.soundManager?.setAmbience('2088');
    this.resetSessionProgress();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.createWorldLayers();

    this.player = new Player(this, 72, 444, {
      reduceMotion: Boolean(this.registry.get('reduceMotion')),
      surfaceAt: () => 'metal',
      onStep: () => this.soundManager?.playFootstep('metal', this.player.x),
    });

    const ground = this.add.rectangle(WORLD_WIDTH / 2, 444, WORLD_WIDTH, 96, 0x000000, 0).setOrigin(0.5, 0);
    this.physics.add.existing(ground, true);
    this.physics.add.collider(this.player, ground);

    this.controls = new InputSystem(this);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.12);
    this.cameras.main.setDeadzone(250, 150);

    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    this.scene.launch('UIScene', { input: this.controls, eraTitle: 'EPILOG — 2088' });
    this.scene.bringToTop('UIScene');
    this.ui = this.scene.get('UIScene') as UIScene;

    this.statusText = this.add.text(20, 72, '', {
      backgroundColor: '#0d0a08cc',
      color: CSS.gold,
      fontFamily: FONT.META,
      fontSize: '12px',
      fontStyle: 'bold',
      padding: { x: 10, y: 6 },
    }).setScrollFactor(0).setDepth(2000);
    this.updateProgressText();

    this.game.events.on(Phaser.Core.Events.POST_STEP, this.syncUIModal, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  update(_time: number, delta: number): void {
    if (this.activeModal || this.ending) {
      this.ui?.setPrompt('');
      return;
    }

    const input = this.controls.read();
    this.player.updatePlayer(input, delta);

    let nearNode = -1;
    BONUS_NODES.forEach((node, index) => {
      if (Math.abs(this.player.x - node.x) < 58) nearNode = index;
    });
    this.activeNode = nearNode;

    if (nearNode >= 0) {
      const complete = Boolean(this.litNodes[nearNode]);
      this.ui.setPrompt(complete
        ? `[SELESAI] ${BONUS_NODES[nearNode].label}`
        : `PERIKSA / SPACE — ${BONUS_NODES[nearNode].label}`);
      if (!complete && input.interact) this.openBonusNode(nearNode);
      return;
    }

    if (this.player.x > 1125 && this.completedCount() === BONUS_NODES.length) {
      this.ui.setPrompt('PERIKSA / SPACE — TEMUI ARTHUR DAN AKHIRI EPILOG');
      if (input.interact) this.finishBonusEpilogue();
      return;
    }

    this.ui.setPrompt('');
  }

  snapshot(): Record<string, unknown> {
    return {
      era: '2088',
      completedNodes: this.completedCount(),
      activeNode: this.activeNode,
      playerX: this.player?.x ?? 0,
      modal: Boolean(this.activeModal),
      ending: this.ending,
      rewards: this.rewards.map(index => BONUS_REWARDS[index].label),
      progress: {
        differences: this.differenceFound.filter(Boolean).length,
        roses: this.roseCollected.filter(Boolean).length,
        dinnerPeople: [...this.dinnerPeople],
        dinnerFoods: [...this.dinnerFoods],
        cats: this.catFound.filter(Boolean).length,
        chemistry: [...this.chemistryOrder],
      },
    };
  }

  private resetSessionProgress(): void {
    this.litNodes = {};
    this.nodeLights = [];
    this.differenceFound = Array<boolean>(DIFFERENCE_SPOTS.length).fill(false);
    this.roseCollected = Array<boolean>(ROSE_HOMES.length).fill(false);
    this.roseCode = '';
    this.dinnerPeople = [null, null, null, null];
    this.dinnerFoods = [null, null, null, null];
    this.dinnerFocusSeat = 0;
    this.dinnerMessage = 'Pilih kursi, lalu tempatkan satu orang dan satu hidangan.';
    this.catFound = Array<boolean>(CAT_SPOTS.length).fill(false);
    this.chemistryOrder = [];
    this.ending = false;
    this.activeNode = -1;
    this.rewards = [];
    this.activeModal = undefined;
    this.endingOverlay = undefined;
    this.modalCleanups = [];
  }

  private createWorldLayers(): void {
    this.add.rectangle(WORLD_WIDTH / 2, GAME_HEIGHT / 2, WORLD_WIDTH, GAME_HEIGHT, 0x90c4e8).setDepth(-30);

    if (this.textures.exists('bonus-city-complete')) {
      this.add.image(0, 0, 'bonus-city-complete')
        .setOrigin(0, 0)
        .setDisplaySize(WORLD_WIDTH, GAME_HEIGHT)
        .setScrollFactor(0.25)
        .setDepth(-25);
    } else if (this.textures.exists('bg2088-far')) {
      this.add.image(0, 92, 'bg2088-far').setOrigin(0).setScale(0.75).setScrollFactor(0.14).setDepth(-25);
    }

    BONUS_NODES.forEach((node, index) => {
      const halo = this.add.ellipse(node.x, 442, 80, 20, GOLD, 0.12).setDepth(438);
      const monolith = this.add.rectangle(node.x, 444, 46, 72, STONE, 0.92)
        .setOrigin(0.5, 1)
        .setStrokeStyle(2, STONE_INK)
        .setDepth(439);
      this.add.text(node.x, 382, `${index + 1}`, {
        color: CSS.gold,
        fontFamily: FONT.TITLE,
        fontSize: '17px',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(440);
      this.nodeLights.push(monolith);

      if (!this.registry.get('reduceMotion')) {
        this.tweens.add({ targets: halo, alpha: 0.34, scaleX: 1.16, duration: 1300 + index * 90, yoyo: true, repeat: -1 });
      }
    });

    if (this.textures.exists('arthur-tua')) {
      this.add.sprite(1160, 444, 'arthur-tua', 0).setOrigin(0.5, 1).setDisplaySize(86, 120).setDepth(444);
      this.add.text(1160, 322, 'ARTHUR', {
        color: CSS.goldBright, fontFamily: FONT.TITLE, fontSize: '12px', fontStyle: 'bold',
        stroke: '#120c07', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(445);
    }
  }

  private createAnimatedProp(key: string, x: number, y: number, height: number, frameRate: number): void {
    if (!this.textures.exists(key)) return;
    const sprite = this.add.sprite(x, y, key, 0).setOrigin(0.5, 1).setDisplaySize(height, height).setDepth(y - 2);
    if (this.registry.get('reduceMotion')) return;
    const animation = `${key}-bonus-native`;
    if (!this.anims.exists(animation)) {
      this.anims.create({
        key: animation,
        frames: this.anims.generateFrameNumbers(key, { frames: [0, 1, 2] }),
        frameRate,
        repeat: -1,
      });
    }
    sprite.play(animation);
  }

  private openBonusNode(index: number): void {
    if (this.activeModal || this.litNodes[index]) return;

    this.controls.setEnabled(false);
    this.player.arcadeBody.setVelocityX(0).setAccelerationX(0);
    this.soundManager?.playSelect();
    this.ui.setPrompt('');
    this.ui.setModal(true);

    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, NIGHT, 0.94)
      .setInteractive({ useHandCursor: false });
    const header = addPaperPanel(this, 20, 8, 920, 52, { radius: 8 });
    const title = this.add.text(GAME_WIDTH / 2, 34, BONUS_NODES[index].label, {
      color: CSS.red, fontFamily: FONT.UI, fontSize: '22px', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.activeModal = this.add.container(0, 0, [shade, header, title])
      .setScrollFactor(0)
      .setDepth(3000);

    const doClose = (pointer?: Phaser.Input.Pointer): void => {
      pointer?.event?.stopPropagation();
      this.soundManager?.playSelect();
      this.closeModal();
    };

    this.modalCloseBtn = this.add.rectangle(856, 34, 118, 30, RED, 0.96)
      .setStrokeStyle(1.5, RED_DARK)
      .setScrollFactor(0)
      .setDepth(5000)
      .setInteractive({ useHandCursor: true });

    this.modalCloseTxt = this.add.text(856, 34, 'X — TUTUP', {
      color: '#FFF8EA', fontFamily: FONT.META, fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5001).setInteractive({ useHandCursor: true });

    this.modalCloseBtn.on('pointerdown', doClose).on('pointerup', doClose);
    this.modalCloseTxt.on('pointerdown', doClose).on('pointerup', doClose);

    this.clearModalBindings();
    this.bindModalKey((event) => {
      if (event.code === 'KeyX' || event.key === 'Escape') this.closeModal();
    });

    if (index === 0) this.buildDifferenceGame(this.activeModal);
    else if (index === 1) this.buildRoseGame(this.activeModal);
    else if (index === 2) this.buildDinnerGame(this.activeModal);
    else if (index === 3) this.buildCatGame(this.activeModal);
    else this.buildChemistryGame(this.activeModal);
  }

  private buildDifferenceGame(modal: Phaser.GameObjects.Container): void {
    const art = this.addArtwork(modal, 'bonus-diff-art', DIFFERENCE_RECT, 'Ilustrasi perbedaan tidak tersedia');
    art.setInteractive({ useHandCursor: true });

    const markerLayer = this.add.container(0, 0);
    const help = this.add.text(GAME_WIDTH / 2, 474, 'Klik atau sentuh setiap perbedaan pada gambar foto di atas.', {
      backgroundColor: '#0d0a08dd', color: CSS.paper, fontFamily: FONT.META,
      fontSize: '11px', padding: { x: 12, y: 5 },
    }).setOrigin(0.5);
    const status = this.add.text(GAME_WIDTH / 2, 510, '', {
      backgroundColor: '#0d0a08ee', color: CSS.brass, fontFamily: FONT.META,
      fontSize: '13px', fontStyle: 'bold', padding: { x: 14, y: 6 },
    }).setOrigin(0.5);
    modal.add([markerLayer, help, status]);

    const render = (): void => {
      markerLayer.removeAll(true);
      DIFFERENCE_SPOTS.forEach((spot, index) => {
        if (!this.differenceFound[index]) return;
        for (const point of [spot.a, spot.b]) {
          markerLayer.add(this.add.circle(
            DIFFERENCE_RECT.x + point[0] * DIFFERENCE_RECT.width,
            DIFFERENCE_RECT.y + point[1] * DIFFERENCE_RECT.height,
            13,
            GREEN,
            0.28,
          ).setStrokeStyle(3, GREEN_BRIGHT));
        }
      });

      const count = this.differenceFound.filter(Boolean).length;
      const isDone = count === DIFFERENCE_SPOTS.length;
      status.setText(isDone
        ? '10 / 10 — SEMUA PERBEDAAN DITEMUKAN (TEKAN SPACE / ENTER UNTUK TUTUP)'
        : `PERBEDAAN DITEMUKAN: ${count} / ${DIFFERENCE_SPOTS.length}`)
        .setColor(isDone ? CSS.greenBright : CSS.brass);
    };

    const mark = (index: number): void => {
      if (index < 0 || this.differenceFound[index]) return;
      this.differenceFound[index] = true;
      this.soundManager?.playLockSuccess();
      if (this.differenceFound.every(Boolean)) this.completeNode(0);
      render();
    };

    art.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y <= 60) return;
      if (this.litNodes[0]) {
        this.closeModal();
        return;
      }
      const index = findDifferenceAt(
        pointer.x - DIFFERENCE_RECT.x,
        pointer.y - DIFFERENCE_RECT.y,
        DIFFERENCE_RECT.width,
        DIFFERENCE_RECT.height,
        this.differenceFound,
      );
      if (index >= 0) mark(index);
      else {
        this.soundManager?.playErrorBuzz();
        status.setText('Belum tepat — amati kedua panel lebih dekat.').setColor(CSS.redBright);
      }
    });

    this.bindModalKey((event) => {
      if (this.litNodes[0] || this.differenceFound.every(Boolean)) {
        if (event.code === 'Space' || event.key === 'Enter' || event.key === 'Escape' || event.code === 'KeyX') {
          event.preventDefault();
          this.closeModal();
          return;
        }
      }
      if (event.key === 'Escape' || event.code === 'KeyX') {
        event.preventDefault();
        this.closeModal();
      }
    });

    render();
  }

  private buildRoseGame(modal: Phaser.GameObjects.Container): void {
    const stage = this.add.container(0, 0);
    modal.add(stage);
    let focus = this.nextOpenIndex(this.roseCollected, -1, 1);

    const mapRosePoint = (point: readonly [number, number]): Phaser.Math.Vector2 => new Phaser.Math.Vector2(
      ROSE_RECT.x + point[0] / ROSE_SOURCE_SIZE.width * ROSE_RECT.width,
      ROSE_RECT.y + point[1] / ROSE_SOURCE_SIZE.height * ROSE_RECT.height,
    );

    const pressCode = (key: string): void => {
      if (this.litNodes[1]) return;
      if (/^\d$/.test(key) && this.roseCode.length < 4) {
        this.roseCode += key;
        this.soundManager?.playGearTick(1.1);
      } else if (key === 'clear') {
        this.roseCode = '';
        this.soundManager?.playSelect();
      } else if (key === 'ok') {
        if (isBonusCode(this.roseCode)) {
          this.soundManager?.playLockSuccess();
          this.completeNode(1);
        } else {
          this.soundManager?.playErrorBuzz();
          this.roseCode = '';
        }
      }
      renderStage();
    };

    const collectRose = (index: number): void => {
      if (index < 0 || this.roseCollected[index]) return;
      this.roseCollected[index] = true;
      this.soundManager?.playGlassClink();
      focus = this.nextOpenIndex(this.roseCollected, index, 1);
      renderStage();
    };

    const renderStage = (): void => {
      stage.removeAll(true);
      const gathered = this.roseCollected.filter(Boolean).length;

      if (gathered < ROSE_HOMES.length) {
        this.addArtwork(stage, 'bonus-mawar-art', ROSE_RECT, 'Ilustrasi buket mawar tidak tersedia');
        const target = mapRosePoint(ROSE_TARGET);
        stage.add(this.add.circle(target.x, target.y, 66, RED, 0.12).setStrokeStyle(3, RED_BRIGHT));
        stage.add(this.add.text(target.x, target.y, `BUKET\n${gathered} / ${ROSE_HOMES.length}`, {
          color: CSS.paper, fontFamily: FONT.TITLE, fontSize: '13px', fontStyle: 'bold', align: 'center',
          stroke: CSS.redDark, strokeThickness: 4,
        }).setOrigin(0.5));

        ROSE_HOMES.forEach((homeSource, index) => {
          if (this.roseCollected[index]) return;
          const home = mapRosePoint(homeSource);
          const token = this.add.circle(home.x, home.y, 22, index === focus ? GOLD : RED, 0.24)
            .setStrokeStyle(3, index === focus ? GOLD_BRIGHT : RED_BRIGHT)
            .setInteractive({ useHandCursor: true, draggable: true });
          const number = this.add.text(home.x, home.y, `${index + 1}`, {
            color: '#FFF8EA', fontFamily: FONT.META, fontSize: '13px', fontStyle: 'bold',
            stroke: CSS.redDark, strokeThickness: 3,
          }).setOrigin(0.5);
          stage.add([token, number]);

          token.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            token.setPosition(dragX, dragY);
            number.setPosition(dragX, dragY);
          });
          token.on('dragend', () => {
            if (Phaser.Math.Distance.Between(token.x, token.y, target.x, target.y) <= 85) {
              collectRose(index);
              return;
            }
            if (this.registry.get('reduceMotion')) {
              token.setPosition(home.x, home.y);
              number.setPosition(home.x, home.y);
            } else {
              this.tweens.add({ targets: [token, number], x: home.x, y: home.y, duration: 180, ease: 'Sine.Out' });
            }
          });
        });

        stage.add(this.add.text(GAME_WIDTH / 2, 500, 'Geser (Drag) buletan nomor 1-5 ke lingkar merah BUKET mawar di tengah.', {
          backgroundColor: '#0d0a08e8', color: CSS.paper, fontFamily: FONT.META,
          fontSize: '12px', padding: { x: 14, y: 7 },
        }).setOrigin(0.5));
        return;
      }

      // Left side artwork: 100% clear rose picture showing hidden year numbers
      this.addArtwork(stage, 'bonus-mawar2-art', { x: 42, y: 70, width: 540, height: 380 }, 'Pesan tahun 2088 tidak tersedia');

      // Right side panel for 4-digit code display and numpad controls
      stage.add(addPaperPanel(this, 598, 70, 316, 380, { radius: 9 }));
      stage.add(this.add.text(756, 92, 'KODE TAHUN 2088', {
        color: CSS.red, fontFamily: FONT.UI, fontSize: '16px', fontStyle: 'bold',
      }).setOrigin(0.5));

      const codePanel = addPaperPanel(this, 636, 116, 240, 52, { radius: 8 });
      const display = this.add.text(756, 142, this.roseCode.padEnd(4, '_'), {
        color: this.litNodes[1] ? CSS.green : CSS.brass,
        fontFamily: FONT.TITLE, fontSize: '28px', fontStyle: 'bold', letterSpacing: 6,
      }).setOrigin(0.5);
      stage.add([codePanel, display]);

      if (this.litNodes[1]) {
        stage.add(this.add.text(756, 260, '2088 TERBACA\nSIMPUL MAWAR LENGKAP', {
          color: CSS.greenBright, fontFamily: FONT.TITLE, fontSize: '18px', fontStyle: 'bold', align: 'center',
          lineSpacing: 6,
        }).setOrigin(0.5));
        stage.add(this.add.text(GAME_WIDTH / 2, 492, '2088 TERBACA — SIMPUL MAWAR LENGKAP (TEKAN SPACE / ENTER UNTUK TUTUP)', {
          backgroundColor: '#567a61e6', color: '#FFF8EA', fontFamily: FONT.META,
          fontSize: '13px', fontStyle: 'bold', padding: { x: 16, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.closeModal()));
        return;
      }

      const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
      digits.forEach((digit, index) => {
        const x = 640 + (index % 5) * 58;
        const y = 200 + Math.floor(index / 5) * 46;
        this.addButton(stage, x, y, 50, 36, digit, () => pressCode(digit));
      });
      this.addButton(stage, 686, 302, 110, 38, 'HAPUS', () => pressCode('clear'));
      this.addButton(stage, 826, 302, 130, 38, 'BACA KODE', () => pressCode('ok'), true);

      stage.add(this.add.text(756, 372, 'Baca 4 angka pada gambar mawar\ndi sebelah kiri dan masukkan kodenya.', {
        color: CSS.body, fontFamily: FONT.UI, fontSize: '13px', align: 'center', lineSpacing: 4,
      }).setOrigin(0.5));
    };

    this.bindModalKey((event) => {
      if (this.litNodes[1]) {
        if (event.code === 'Space' || event.key === 'Enter' || event.key === 'Escape' || event.code === 'KeyX') {
          event.preventDefault();
          this.closeModal();
          return;
        }
      }
      if (this.roseCollected.every(Boolean)) {
        if (/^\d$/.test(event.key)) pressCode(event.key);
        else if (event.key === 'Backspace' || event.key === 'Delete') pressCode('clear');
        else if (event.key === 'Enter') pressCode('ok');
        return;
      }
      if (event.key === 'Escape' || event.code === 'KeyX') {
        event.preventDefault();
        this.closeModal();
      }
    });

    renderStage();
  }

  private buildDinnerGame(modal: Phaser.GameObjects.Container): void {
    const stage = this.add.container(0, 0);
    modal.add(stage);

    const seatPositions = [
      { x: 110, y: 125 },
      { x: 238, y: 125 },
      { x: 366, y: 125 },
      { x: 494, y: 125 },
    ];

    const assignPersonToSeat = (person: DinnerPerson, seatIndex: number): void => {
      if (this.litNodes[2]) return;
      const previousSeat = this.dinnerPeople.indexOf(person);
      if (previousSeat >= 0) this.dinnerPeople[previousSeat] = null;
      this.dinnerPeople[seatIndex] = person;
      this.dinnerFocusSeat = seatIndex;
      this.soundManager?.playSelect();
      this.dinnerMessage = `${person} ditempatkan di kursi ${seatIndex + 1}.`;
      render();
    };

    const assignFoodToSeat = (food: DinnerFood, seatIndex: number): void => {
      if (this.litNodes[2]) return;
      const previousSeat = this.dinnerFoods.indexOf(food);
      if (previousSeat >= 0) this.dinnerFoods[previousSeat] = null;
      this.dinnerFoods[seatIndex] = food;
      this.dinnerFocusSeat = seatIndex;
      this.soundManager?.playGlassClink();
      this.dinnerMessage = `${FOOD_LABELS[food]} disajikan di kursi ${seatIndex + 1}.`;
      render();
    };

    const findTargetSeat = (pointerX: number, pointerY: number): number => {
      for (let i = 0; i < seatPositions.length; i++) {
        const pos = seatPositions[i];
        if (Math.abs(pointerX - pos.x) < 60 && pointerY >= 70 && pointerY <= 400) {
          return i;
        }
      }
      return -1;
    };

    const checkDinner = (): void => {
      if (this.litNodes[2]) return;
      if (isDinnerValid(this.dinnerPeople, this.dinnerFoods)) {
        this.dinnerMessage = 'SEMUA PETUNJUK TERPENUHI — MAKAN MALAM SIAP';
        this.completeNode(2);
      } else {
        this.soundManager?.playErrorBuzz();
        this.dinnerMessage = this.dinnerPeople.includes(null) || this.dinnerFoods.includes(null)
          ? 'Lengkapi empat orang dan empat hidangan terlebih dahulu.'
          : 'Susunan belum memenuhi seluruh petunjuk. Coba lagi.';
      }
      render();
    };

    const render = (): void => {
      stage.removeAll(true);
      this.addArtwork(stage, 'bonus-dinner-bg', { x: 42, y: 100, width: 560, height: 300 }, 'Ilustrasi meja makan tidak tersedia');
      stage.add(addPaperPanel(this, 598, 70, 316, 330, { radius: 9 }));
      stage.add(this.add.text(620, 82, 'PETUNJUK', {
        color: CSS.red, fontFamily: FONT.UI, fontSize: '16px', fontStyle: 'bold',
      }));
      stage.add(this.add.text(620, 112,
        '1. Kursi 1 menyantap nasi goreng.\n' +
        '2. Citra duduk di kursi 4.\n' +
        '3. Dina duduk di kursi 1 atau 4.\n' +
        '4. Adi duduk sebelum kursi steak.\n' +
        '5. Spaghetti bersebelahan dengan Budi.\n' +
        '6. Adi tidak makan udang atau nasi.', {
        color: CSS.body, fontFamily: FONT.UI, fontSize: '15px', lineSpacing: 5,
      }));

      seatPositions.forEach((position, index) => {
        const focused = index === this.dinnerFocusSeat;

        // 1. Tag Nama Orang di atas kepala figur (y = 110, tanpa menutupi kepala)
        const nameBox = this.add.rectangle(position.x, 110, 118, 32, focused ? RED : STONE, 0.95)
          .setStrokeStyle(focused ? 2.5 : 1.5, focused ? GOLD : STONE_INK)
          .setInteractive({ useHandCursor: true });
        nameBox.on('pointerup', () => {
          this.dinnerFocusSeat = index;
          this.dinnerMessage = `Kursi ${index + 1} dipilih. Geser (Drag) atau klik orang / makanan ke sini.`;
          render();
        });
        stage.add(nameBox);

        stage.add(this.add.text(position.x, 110, `${index + 1}. ${this.dinnerPeople[index] ?? '— orang —'}`, {
          color: '#FFF8EA', fontFamily: FONT.META, fontSize: '11px', fontStyle: 'bold',
        }).setOrigin(0.5));

        // 2. Slot Hidangan Makanan di atas permukaan meja makan (y = 290)
        const foodBox = this.add.rectangle(position.x, 290, 118, 46, focused ? RED : STONE, 0.95)
          .setStrokeStyle(focused ? 2.5 : 1.5, focused ? GOLD : STONE_INK)
          .setInteractive({ useHandCursor: true });
        foodBox.on('pointerup', () => {
          this.dinnerFocusSeat = index;
          this.dinnerMessage = `Kursi ${index + 1} dipilih. Geser (Drag) atau klik orang / makanan ke sini.`;
          render();
        });
        stage.add(foodBox);

        const currentFood = this.dinnerFoods[index];
        if (currentFood && this.textures.exists(`food-${currentFood}`)) {
          stage.add(this.add.image(position.x - 34, 290, `food-${currentFood}`).setDisplaySize(38, 28));
          stage.add(this.add.text(position.x + 12, 290, FOOD_LABELS[currentFood], {
            color: '#FFF8EA', fontFamily: FONT.META, fontSize: '10px', fontStyle: 'bold',
          }).setOrigin(0.5));
        } else {
          stage.add(this.add.text(position.x, 290, currentFood ? FOOD_LABELS[currentFood] : '— hidangan —', {
            color: CSS.paper, fontFamily: FONT.UI, fontSize: '11px',
          }).setOrigin(0.5));
        }
      });

      this.addButton(stage, 756, 352, 240, 38, 'PERIKSA SUSUNAN', checkDinner, true);

      DINNER_PEOPLE.forEach((person, index) => {
        const cardX = 110 + index * 128;
        const cardY = 414;
        const isAssigned = this.dinnerPeople.includes(person);

        const bg = this.add.rectangle(0, 0, 118, 34, isAssigned ? RED : STONE, 0.95)
          .setStrokeStyle(isAssigned ? 2.5 : 1.5, isAssigned ? GOLD : STONE_INK);
        const txt = this.add.text(0, 0, person, {
          color: '#FFF8EA', fontFamily: FONT.META, fontSize: '12px', fontStyle: 'bold',
        }).setOrigin(0.5);

        const cardContainer = this.add.container(cardX, cardY, [bg, txt])
          .setSize(118, 34)
          .setInteractive({ useHandCursor: true });

        this.input.setDraggable(cardContainer);

        cardContainer.on('dragstart', () => {
          stage.bringToTop(cardContainer);
          bg.setStrokeStyle(3, 0xfff0a0, 1);
        });

        cardContainer.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          cardContainer.x = dragX;
          cardContainer.y = dragY;
        });

        cardContainer.on('dragend', (pointer: Phaser.Input.Pointer) => {
          const targetSeat = findTargetSeat(pointer.x, pointer.y);
          if (targetSeat >= 0) {
            assignPersonToSeat(person, targetSeat);
          } else {
            assignPersonToSeat(person, this.dinnerFocusSeat);
          }
        });

        stage.add(cardContainer);
      });

      DINNER_FOODS.forEach((food, index) => {
        const cardX = 110 + index * 128;
        const cardY = 464;
        const isAssigned = this.dinnerFoods.includes(food);

        const bg = this.add.rectangle(0, 0, 118, 44, isAssigned ? RED : STONE, 0.95)
          .setStrokeStyle(isAssigned ? 2.5 : 1.5, isAssigned ? GOLD : STONE_INK);

        const elements: Phaser.GameObjects.GameObject[] = [bg];
        if (this.textures.exists(`food-${food}`)) {
          elements.push(this.add.image(-36, 0, `food-${food}`).setDisplaySize(38, 28));
        }
        elements.push(this.add.text(12, 0, FOOD_LABELS[food], {
          color: '#FFF8EA', fontFamily: FONT.META, fontSize: '10px', fontStyle: 'bold',
        }).setOrigin(0.5));

        const cardContainer = this.add.container(cardX, cardY, elements)
          .setSize(118, 44)
          .setInteractive({ useHandCursor: true });

        this.input.setDraggable(cardContainer);

        cardContainer.on('dragstart', () => {
          stage.bringToTop(cardContainer);
          bg.setStrokeStyle(3, 0xfff0a0, 1);
        });

        cardContainer.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          cardContainer.x = dragX;
          cardContainer.y = dragY;
        });

        cardContainer.on('dragend', (pointer: Phaser.Input.Pointer) => {
          const targetSeat = findTargetSeat(pointer.x, pointer.y);
          if (targetSeat >= 0) {
            assignFoodToSeat(food, targetSeat);
          } else {
            assignFoodToSeat(food, this.dinnerFocusSeat);
          }
        });

        stage.add(cardContainer);
      });

      stage.add(this.add.text(GAME_WIDTH / 2, 512, this.litNodes[2] ? 'SEMUA PETUNJUK TERPENUHI — MAKAN MALAM SIAP (TEKAN SPACE / ENTER UNTUK TUTUP)' : this.dinnerMessage, {
        backgroundColor: this.litNodes[2] ? '#567a61e6' : '#0d0a08e8',
        color: this.litNodes[2] ? '#FFF8EA' : CSS.gold,
        fontFamily: FONT.META, fontSize: '12px', fontStyle: 'bold', padding: { x: 14, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (this.litNodes[2]) this.closeModal();
      }));
    };

    this.bindModalKey((event) => {
      if (this.litNodes[2]) {
        if (event.code === 'Space' || event.key === 'Enter' || event.key === 'Escape' || event.code === 'KeyX') {
          event.preventDefault();
          this.closeModal();
          return;
        }
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.dinnerFocusSeat = Phaser.Math.Wrap(
          this.dinnerFocusSeat + (event.key === 'ArrowLeft' ? -1 : 1), 0, 4,
        );
        render();
      } else if (event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        checkDinner();
      }
    });

    render();
  }

  private buildCatGame(modal: Phaser.GameObjects.Container): void {
    const art = this.addArtwork(modal, 'bonus-cats-art', CAT_RECT, 'Ilustrasi 18 kucing tidak tersedia');
    art.setInteractive({ useHandCursor: true });
    const markerLayer = this.add.container(0, 0);
    const help = this.add.text(GAME_WIDTH / 2, 466, 'Klik atau sentuh setiap kucing pada gambar untuk menemukannya (bebas urutan).', {
      backgroundColor: '#0d0a08dd', color: CSS.paper, fontFamily: FONT.META,
      fontSize: '11px', padding: { x: 12, y: 5 },
    }).setOrigin(0.5);
    const status = this.add.text(GAME_WIDTH / 2, 505, '', {
      backgroundColor: '#0d0a08ee', color: CSS.brass, fontFamily: FONT.META,
      fontSize: '13px', fontStyle: 'bold', padding: { x: 14, y: 6 },
    }).setOrigin(0.5);
    modal.add([markerLayer, help, status]);

    const render = (): void => {
      markerLayer.removeAll(true);
      CAT_SPOTS.forEach((spot, index) => {
        if (!this.catFound[index]) return;
        markerLayer.add(this.add.circle(
          CAT_RECT.x + spot[0] * CAT_RECT.width,
          CAT_RECT.y + spot[1] * CAT_RECT.height,
          12,
          GREEN,
          0.25,
        ).setStrokeStyle(3, GREEN_BRIGHT));
      });
      const count = this.catFound.filter(Boolean).length;
      const isDone = count === CAT_SPOTS.length;
      status.setText(isDone
        ? '18 / 18 — SEMUA KUCING DITEMUKAN (TEKAN SPACE / ENTER UNTUK TUTUP)'
        : `KUCING DITEMUKAN: ${count} / ${CAT_SPOTS.length}`)
        .setColor(isDone ? CSS.greenBright : CSS.brass);
    };

    const mark = (index: number): void => {
      if (index < 0 || this.catFound[index]) return;
      this.catFound[index] = true;
      this.soundManager?.playLockSuccess();
      if (this.catFound.every(Boolean)) this.completeNode(3);
      render();
    };

    art.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y <= 60) return;
      if (this.litNodes[3]) {
        this.closeModal();
        return;
      }
      const index = findCatAt(
        pointer.x - CAT_RECT.x,
        pointer.y - CAT_RECT.y,
        CAT_RECT.width,
        CAT_RECT.height,
        this.catFound,
        50,
      );
      if (index >= 0) mark(index);
      else {
        this.soundManager?.playErrorBuzz();
        status.setText('Belum ada kucing di titik itu — periksa siluet dan sudut gambar.').setColor(CSS.redBright);
      }
    });

    this.bindModalKey((event) => {
      if (this.litNodes[3] || this.catFound.every(Boolean)) {
        if (event.code === 'Space' || event.key === 'Enter' || event.key === 'Escape' || event.code === 'KeyX') {
          event.preventDefault();
          this.closeModal();
          return;
        }
      }
      if (event.key === 'Escape' || event.code === 'KeyX') {
        event.preventDefault();
        this.closeModal();
      }
    });

    render();
  }

  private buildChemistryGame(modal: Phaser.GameObjects.Container): void {
    const stage = this.add.container(0, 0);
    modal.add(stage);
    let focus = Math.min(this.chemistryOrder.length, CHEMISTRY_ITEMS.length - 1);
    let message = 'Campurkan kenangan sesuai urutan garis waktu.';

    const addItem = (item: ChemistryItem): void => {
      if (this.litNodes[4]) return;
      const result = advanceChemistry(this.chemistryOrder, item);
      this.chemistryOrder = result.order;
      if (!result.correct) {
        this.soundManager?.playErrorBuzz();
        message = 'Reaksi runtuh — mulai lagi dari arloji 1944.';
        focus = 0;
      } else {
        this.soundManager?.playWaterShimmer();
        message = `${this.chemistryOrder.length} / ${CHEMISTRY_ORDER.length} bahan bereaksi dengan benar.`;
        focus = Math.min(this.chemistryOrder.length, CHEMISTRY_ITEMS.length - 1);
        if (result.complete) {
          message = 'WATCH → ROSE → GEM — GELAS CINTA BERHASIL';
          this.completeNode(4);
        }
      }
      render();
    };

    const render = (): void => {
      stage.removeAll(true);
      const glassKey = this.litNodes[4] ? 'bonus-love-glass' : 'bonus-chem-glass';
      this.addArtwork(stage, glassKey, { x: 54, y: 92, width: 500, height: 281 }, 'Gelas kimia tidak tersedia');
      stage.add(this.add.text(304, 402, this.litNodes[4] ? 'GELAS CINTA TERBENTUK' : 'GELAS KIMIA KOSONG', {
        color: this.litNodes[4] ? CSS.greenBright : CSS.paper, fontFamily: FONT.TITLE,
        fontSize: '15px', fontStyle: 'bold', stroke: '#120c07', strokeThickness: 4,
      }).setOrigin(0.5));

      CHEMISTRY_ITEMS.forEach((item, index) => {
        const selected = this.chemistryOrder.includes(item.id);
        const focused = index === focus;
        const y = 130 + index * 108;
        const background = this.add.rectangle(738, y, 318, 84, selected ? GREEN : focused ? RED : STONE, 0.94)
          .setStrokeStyle(focused ? 3 : 2, focused ? GOLD : selected ? GREEN_BRIGHT : STONE_INK)
          .setInteractive({ useHandCursor: true });
        background.on('pointerup', () => {
          focus = index;
          addItem(item.id);
        });
        stage.add(background);
        if (this.textures.exists(item.texture)) {
          stage.add(this.add.image(625, y, item.texture).setDisplaySize(72, 58));
        }
        stage.add(this.add.text(684, y, `${index + 1}. ${item.label}${selected ? '  ✓' : ''}`, {
          color: selected ? CSS.greenBright : '#FFF8EA', fontFamily: FONT.META, fontSize: '14px', fontStyle: 'bold',
        }).setOrigin(0, 0.5));
      });

      stage.add(this.add.text(GAME_WIDTH / 2, 474, this.litNodes[4] ? 'WATCH → ROSE → GEM — GELAS CINTA BERHASIL (TEKAN SPACE / ENTER UNTUK TUTUP)' : message, {
        backgroundColor: this.litNodes[4] ? '#567a61e6' : '#0d0a08e8',
        color: this.litNodes[4] ? '#FFF8EA' : CSS.gold,
        fontFamily: FONT.META, fontSize: '12px', fontStyle: 'bold', padding: { x: 14, y: 7 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (this.litNodes[4]) this.closeModal();
      }));
      stage.add(this.add.text(GAME_WIDTH / 2, 515, 'Klik bahan • Keyboard: ↑/↓ pilih, Enter campurkan', {
        color: CSS.paper, fontFamily: FONT.META, fontSize: '11px',
      }).setOrigin(0.5));
    };

    this.bindModalKey((event) => {
      if (this.litNodes[4]) {
        if (event.code === 'Space' || event.key === 'Enter' || event.key === 'Escape' || event.code === 'KeyX') {
          event.preventDefault();
          this.closeModal();
          return;
        }
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        focus = Phaser.Math.Wrap(focus + (event.key === 'ArrowUp' ? -1 : 1), 0, CHEMISTRY_ITEMS.length);
        render();
      } else if (event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        addItem(CHEMISTRY_ITEMS[focus].id);
      }
    });

    render();
  }

  private addArtwork(
    container: Phaser.GameObjects.Container,
    key: string,
    rect: DisplayRect,
    fallbackLabel: string,
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    if (this.textures.exists(key)) {
      const image = this.add.image(rect.x, rect.y, key).setOrigin(0).setDisplaySize(rect.width, rect.height);
      container.add(image);
      return image;
    }

    const fallback = this.add.rectangle(rect.x, rect.y, rect.width, rect.height, STONE, 1)
      .setOrigin(0)
      .setStrokeStyle(2, STONE_INK);
    const label = this.add.text(rect.x + rect.width / 2, rect.y + rect.height / 2, fallbackLabel, {
      color: CSS.paper, fontFamily: FONT.META, fontSize: '16px', align: 'center',
      wordWrap: { width: rect.width - 60 },
    }).setOrigin(0.5);
    container.add([fallback, label]);
    return fallback;
  }

  private addButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onPress: () => void,
    selected = false,
  ): Phaser.GameObjects.Rectangle {
    const background = this.add.rectangle(x, y, width, height, RED, 0.96)
      .setStrokeStyle(selected ? 3 : 2, selected ? GOLD : RED_DARK)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      color: '#FFF8EA', fontFamily: FONT.META, fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    background.on('pointerup', onPress);
    text.on('pointerup', onPress);
    container.add([background, text]);
    return background;
  }

  private nextOpenIndex(found: readonly boolean[], from: number, direction: -1 | 1): number {
    if (found.every(Boolean)) return -1;
    for (let step = 1; step <= found.length; step += 1) {
      const index = Phaser.Math.Wrap(from + direction * step, 0, found.length);
      if (!found[index]) return index;
    }
    return -1;
  }

  private completeNode(index: number): void {
    if (this.litNodes[index]) return;
    this.litNodes[index] = true;
    this.nodeLights[index]?.setFillStyle(GREEN, 0.96).setStrokeStyle(3, GOLD);
    this.rewards.push(index);
    this.soundManager?.playSuccessFanfare();
    this.ui?.showToast(`${BONUS_REWARDS[index].label} menjadi bagian dari kenangan ini.`, 3000);
    this.updateProgressText();
  }

  private completedCount(): number {
    return Object.values(this.litNodes).filter(Boolean).length;
  }

  private updateProgressText(): void {
    const count = this.completedCount();
    this.statusText?.setText(`SIMPUL KENANGAN: ${count} / ${BONUS_NODES.length}${count === BONUS_NODES.length ? '  •  TEMUI ARTHUR' : ''}`);
  }

  private bindModalKey(handler: (event: KeyboardEvent) => void): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.on('keydown', handler);
    this.modalCleanups.push(() => keyboard.off('keydown', handler));
  }

  private clearModalBindings(): void {
    this.modalCleanups.splice(0).forEach((cleanup) => cleanup());
  }

  private closeModal(): void {
    if (!this.activeModal && !this.modalCloseBtn) return;
    this.clearModalBindings();
    this.modalCloseBtn?.destroy();
    this.modalCloseTxt?.destroy();
    this.modalCloseBtn = undefined;
    this.modalCloseTxt = undefined;
    this.activeModal?.destroy(true);
    this.activeModal = undefined;
    this.controls.setEnabled(true);
    this.ui.setModal(false);
  }

  private syncUIModal(): void {
    this.ui?.setModal(Boolean(this.activeModal) || this.ending);
  }

  private finishBonusEpilogue(): void {
    if (this.ending) return;
    this.ending = true;
    this.controls.setEnabled(false);
    this.player.arcadeBody.setVelocityX(0).setAccelerationX(0);
    this.ui.setPrompt('');
    this.ui.setModal(true);
    this.save.data.bonusSeen = true;
    this.save.save(this.save.data);
    this.soundManager?.playSuccessFanfare();

    const elements: Phaser.GameObjects.GameObject[] = [];
    if (this.textures.exists('bonus-city-complete')) {
      elements.push(this.add.image(0, 0, 'bonus-city-complete').setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT));
      elements.push(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, NIGHT, 0.52));
    } else {
      elements.push(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, NIGHT, 1));
    }

    elements.push(addPaperPanel(this, 230, 128, 500, 290, { radius: 9 }));
    const title = this.add.text(GAME_WIDTH / 2, 180, 'HEARTS ACROSS TIME • EPILOG LENGKAP', {
      color: CSS.red, fontFamily: FONT.UI, fontSize: '26px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const copy = this.add.text(GAME_WIDTH / 2, 262,
      'Seluruh kenangan, cinta, dan penantian 55 tahun telah abadi.\n' +
      'Arthur dan Elena akhirnya berjalan menuju masa depan yang sama.', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '19px',
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5);
    const button = this.add.rectangle(GAME_WIDTH / 2, 372, 330, 40, RED, 0.96)
      .setStrokeStyle(1.5, RED_DARK)
      .setInteractive({ useHandCursor: true });
    const buttonLabel = this.add.text(GAME_WIDTH / 2, 372, 'ENTER / SPACE — KEMBALI KE JUDUL', {
      color: '#FFF8EA', fontFamily: FONT.META, fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const leave = (): void => {
      this.scene.start('TitleScene');
    };
    button.on('pointerup', leave);
    elements.push(title, copy, button, buttonLabel);
    this.endingOverlay = this.add.container(0, 0, elements).setScrollFactor(0).setDepth(4000);

    this.clearModalBindings();
    this.bindModalKey((event) => {
      if (event.key === 'Enter' || event.code === 'Space') leave();
    });
  }

  private shutdown(): void {
    this.game.events.off(Phaser.Core.Events.POST_STEP, this.syncUIModal, this);
    this.clearModalBindings();
    this.ui?.setModal(false);
    this.scene.stop('UIScene');
    this.controls?.destroy();
    this.activeModal?.destroy(true);
    this.endingOverlay?.destroy(true);
    this.player?.destroy();
    this.activeModal = undefined;
    this.endingOverlay = undefined;
  }
}
