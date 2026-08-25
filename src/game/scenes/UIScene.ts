import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { saveOptions, type GameOptions } from '../options';
import type { InputSystem } from '../systems/InputSystem';
import type { RunState } from '../systems/SaveSystem';

type UIData = { input: InputSystem; eraTitle?: string; run?: RunState };
type PauseMenuItem = { label: () => string; action?: () => void; adjust?: (direction: number) => void };

const GAMEPLAY_SCENES = [
  'DialogueScene', 'DiaryScene', 'WatchRepairScene', 'SpotlightChallengeScene',
  'SignalTuneScene', 'RosePuzzleScene', 'GemAlignScene', 'PhotoPuzzleScene',
  'CryoBalanceScene', 'Era1999Scene', 'Era1968Scene', 'Era1944Scene', 'Bonus2088Scene',
] as const;

const MODAL_SCENES = GAMEPLAY_SCENES.slice(0, 9);

const STORY_ITEMS_DEF = [
  { id: 'watch', label: 'Jam Saku' },
  { id: 'flower', label: 'Mawar Kering' },
  { id: 'water_gem', label: 'Permata Air' },
  { id: 'arthur_photo', label: 'Foto Arthur' },
] as const;

export class UIScene extends Phaser.Scene {
  private controls?: InputSystem;
  private eraTitleText?: Phaser.GameObjects.Text;
  private prompt?: Phaser.GameObjects.Text;
  private promptText = '';
  private toast?: Phaser.GameObjects.Container;
  private inventoryContainer?: Phaser.GameObjects.Container;
  private inventorySlots: Array<{ bg: Phaser.GameObjects.Arc; glyph: Phaser.GameObjects.Graphics }> = [];
  private inventorySignature = '';
  private run?: RunState;
  private touchObjects: Phaser.GameObjects.Text[] = [];
  private pausePanel?: Phaser.GameObjects.Container;
  private pauseMenuItems: PauseMenuItem[] = [];
  private pauseButtons: Phaser.GameObjects.Text[] = [];
  private pauseSelection = 0;
  private paused = false;
  private stateBeforePause = '';
  private modal = false;
  private modalOwned = false;
  private suppressPauseOnce = false;
  private pauseKeys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('UIScene');
  }

  create(data: UIData): void {
    this.resetRuntimeState();
    this.controls = data.input;
    this.run = data.run;
    const title = data.eraTitle || 'HEARTS ACROSS TIME';

    this.eraTitleText = this.add.text(20, 18, title, {
      color: '#f4d98d', fontFamily: 'Cinzel, serif', fontSize: '13px', letterSpacing: 0.8,
      stroke: '#140d08', strokeThickness: 4,
    });
    this.add.rectangle(20, 43, 46, 1, 0xf4d98d, 0.65).setOrigin(0, 0.5);
    this.prompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 62, '', {
      backgroundColor: '#100c09dd', color: '#fff4d1', fontFamily: 'Patrick Hand, sans-serif',
      fontSize: '18px', padding: { x: 18, y: 10 }, align: 'center',
    }).setOrigin(0.5).setVisible(false);

    this.createInventoryHUD();
    this.refreshInventory();

    const touchMode = this.sys.game.device.input.touch || new URLSearchParams(location.search).get('touch') === '1';
    if (touchMode) this.createTouchControls();
    this.createTopButtons();
    this.pauseKeys = this.input.keyboard?.addKeys('ESC,P,R,M,UP,DOWN,LEFT,RIGHT,W,A,S,D,ENTER,SPACE') as typeof this.pauseKeys;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.resetRuntimeState, this);
  }

  update(): void {
    this.refreshInventory();
    if (!this.pauseKeys) return;
    const hasModal = MODAL_SCENES.some(name => this.scene.isActive(name));
    if (!this.paused && !this.modalOwned && hasModal !== this.modal) this.setModal(hasModal, false);
    if (this.suppressPauseOnce) {
      this.suppressPauseOnce = false;
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.ESC) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.P)) {
      this.togglePause();
    } else if (this.paused) {
      if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.R)) this.restartCycle();
      else if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.M)) this.leaveGameplay('TitleScene');
      else if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.UP) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.W)) this.movePauseSelection(-1);
      else if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.DOWN) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.S)) this.movePauseSelection(1);
      else if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.LEFT) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.A)) this.adjustPauseItem(-1);
      else if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.RIGHT) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.D)) this.adjustPauseItem(1);
      else if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.ENTER) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.SPACE)) this.activatePauseItem();
    }
  }

  setPrompt(text = ''): void {
    if (!this.prompt) return;
    const changed = text !== this.promptText;
    this.promptText = text;
    this.prompt.setText(text).setVisible(Boolean(text) && !this.paused && !this.modal);
    if (!changed || !text || this.registry.get('reduceMotion')) return;
    this.tweens.killTweensOf(this.prompt);
    this.prompt.setScale(0.92);
    this.tweens.add({ targets: this.prompt, scale: 1, duration: 150, ease: 'Back.easeOut' });
  }

  setModal(on: boolean, owned = true): void {
    if (this.modal && !on) {
      this.pauseKeys?.ESC.reset();
      this.suppressPauseOnce = true;
    }
    this.modalOwned = owned && on;
    this.modal = on;
    this.touchObjects.forEach((object) => object.setVisible(!on && !this.paused));
    if (on) this.prompt?.setVisible(false);
  }

  showToast(text: string, duration = 2200): void {
    this.toast?.destroy();
    const isReduced = Boolean(this.registry.get('reduceMotion'));
    const toastCard = this.add.rectangle(0, 0, 430, 58, 0x18120e, 0.94)
      .setStrokeStyle(2, 0x6a4930);
    const toastInner = this.add.graphics();
    toastInner.lineStyle(1, 0xd7b45c, 0.35);
    toastInner.lineBetween(-207, 23, 207, 23);

    const toastBody = this.add.text(0, 0, text, {
      color: '#f4eadb',
      fontFamily: 'Patrick Hand, sans-serif',
      fontSize: '18px',
    }).setOrigin(0.5);

    this.toast = this.add.container(GAME_WIDTH / 2, 88, [toastCard, toastInner, toastBody])
      .setDepth(3000);

    if (!isReduced) {
      this.toast.setAlpha(0).setY(102);
      this.tweens.add({
        targets: this.toast,
        alpha: 1,
        y: 88,
        duration: 200,
        ease: 'Sine.easeOut',
      });
    }

    this.time.delayedCall(duration, () => {
      if (this.toast) {
        if (!isReduced) {
          this.tweens.add({
            targets: this.toast,
            alpha: 0,
            y: 76,
            duration: 200,
            onComplete: () => { this.toast?.destroy(); this.toast = undefined; },
          });
        } else {
          this.toast.destroy();
          this.toast = undefined;
        }
      }
    });
  }

  isPaused(): boolean {
    return this.paused;
  }

  private createTouchControls(): void {
    const hold = (x: number, label: string, key: 'left' | 'right'): void => {
      const button = this.add.text(x, GAME_HEIGHT - 56, label, {
        backgroundColor: '#071018aa', color: '#f5f0e8', fontSize: '24px',
        padding: { x: 18, y: 12 },
      }).setOrigin(0.5).setInteractive();
      button.on('pointerdown', () => this.controls?.setTouch(key, true));
      button.on('pointerup', () => this.controls?.setTouch(key, false));
      button.on('pointerout', () => this.controls?.setTouch(key, false));
      this.touchObjects.push(button);
    };
    hold(62, 'KIRI', 'left');
    hold(132, 'KANAN', 'right');
    const action = this.add.text(GAME_WIDTH - 78, GAME_HEIGHT - 58, 'PERIKSA', {
      backgroundColor: '#94342ecc', color: '#fff8ea', fontFamily: 'Poppins, sans-serif',
      fontSize: '12px', padding: { x: 16, y: 14 },
    }).setOrigin(0.5).setInteractive();
    action.on('pointerdown', () => this.controls?.triggerTouch('interact'));
    this.touchObjects.push(action);
    this.input.on('pointerup', () => this.controls?.clearTouchMovement());
  }

  private createInventoryHUD(): void {
    const w = 194, h = 38, x = GAME_WIDTH - w - 18, y = 52;
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x07090c, 0.72)
      .setStrokeStyle(1.2, 0xf1d58b, 0.55);
    const tasLabel = this.add.text(x + 10, y + h / 2, 'KENANGAN', {
      color: '#f1d58b',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0, 0.5);

    this.inventorySlots = [];
    const slotObjects: Phaser.GameObjects.GameObject[] = [bg, tasLabel];

    STORY_ITEMS_DEF.forEach((it, idx) => {
      const cx = x + 82 + idx * 25;
      const cy = y + h / 2;
      const slotBg = this.add.circle(cx, cy, 11, 0xf5f0e8, 0.05)
        .setStrokeStyle(1.1, 0xf5f0e8, 0.18);
      const glyph = this.add.graphics();
      this.drawInventoryGlyph(glyph, it.id, cx, cy, 0xf5f0e8, 0.2);

      this.inventorySlots.push({ bg: slotBg, glyph });
      slotObjects.push(slotBg, glyph);
    });

    this.inventoryContainer = this.add.container(0, 0, slotObjects).setVisible(false);
  }

  private refreshInventory(): void {
    if (!this.run) return;
    const signature = STORY_ITEMS_DEF.map(it => this.run?.inventory[it.id] ? '1' : '0').join('');
    if (signature === this.inventorySignature) return;
    this.inventorySignature = signature;
    const ownedCount = STORY_ITEMS_DEF.filter(it => Boolean(this.run?.inventory[it.id])).length;
    const hasItems = ownedCount > 0;

    if (this.inventoryContainer) {
      this.inventoryContainer.setVisible(hasItems);
      STORY_ITEMS_DEF.forEach((it, idx) => {
        const slot = this.inventorySlots[idx];
        if (!slot) return;
        const has = Boolean(this.run?.inventory[it.id]);
        slot.bg.setFillStyle(has ? 0xf7d984 : 0xf5f0e8, has ? 0.22 : 0.05);
        slot.bg.setStrokeStyle(1.1, has ? 0xf7d984 : 0xf5f0e8, has ? 1 : 0.18);
        this.drawInventoryGlyph(slot.glyph, it.id, slot.bg.x, slot.bg.y, has ? 0xfff0a0 : 0xf5f0e8, has ? 1 : 0.18);
      });
    }
  }

  private drawInventoryGlyph(
    graphics: Phaser.GameObjects.Graphics,
    id: typeof STORY_ITEMS_DEF[number]['id'],
    x: number,
    y: number,
    color: number,
    alpha: number,
  ): void {
    graphics.clear().lineStyle(1.4, color, alpha);
    if (id === 'watch') {
      graphics.strokeCircle(x, y, 5).lineBetween(x, y, x, y - 3).lineBetween(x, y, x + 3, y + 2);
    } else if (id === 'flower') {
      graphics.strokeCircle(x, y - 1, 2).strokeCircle(x - 3, y - 2, 2).strokeCircle(x + 3, y - 2, 2)
        .lineBetween(x, y + 1, x, y + 6);
    } else if (id === 'water_gem') {
      graphics.strokePoints([
        new Phaser.Math.Vector2(x, y - 6),
        new Phaser.Math.Vector2(x + 5, y),
        new Phaser.Math.Vector2(x, y + 6),
        new Phaser.Math.Vector2(x - 5, y),
      ], true);
    } else {
      graphics.strokeRect(x - 6, y - 5, 12, 10).lineBetween(x - 4, y + 3, x, y - 1).lineBetween(x, y - 1, x + 4, y + 3);
    }
  }

  private createTopButtons(): void {
    const soundManager = this.registry.get('soundManager') as { setMuted: (m: boolean) => void; muted: boolean } | undefined;
    let muted = soundManager?.muted ?? false;
    const makeButton = (x: number, width: number, label: string, onPress: () => void): {
      bg: Phaser.GameObjects.Rectangle;
      icon: Phaser.GameObjects.Graphics;
      label: Phaser.GameObjects.Text;
      container: Phaser.GameObjects.Container;
    } => {
      const bg = this.add.rectangle(0, 0, width, 30, 0x090b10, 0.76).setStrokeStyle(1, 0xf1d58b, 0.58);
      const icon = this.add.graphics();
      const buttonLabel = this.add.text(-width / 2 + 29, 0, label, {
        color: '#f5f0e8', fontFamily: 'Poppins, sans-serif', fontSize: '8px', letterSpacing: 0.5,
      }).setOrigin(0, 0.5);
      const container = this.add.container(x, 27, [bg, icon, buttonLabel])
        .setSize(width, 30)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x36251d, 0.94).setStrokeStyle(1.4, 0xf1d58b, 0.9))
        .on('pointerout', () => bg.setFillStyle(0x090b10, 0.76).setStrokeStyle(1, 0xf1d58b, 0.58))
        .on('pointerup', onPress);
      return { bg, icon, label: buttonLabel, container };
    };

    const music = makeButton(GAME_WIDTH - 110, 92, 'MUSIK', () => {
      muted = !muted;
      soundManager?.setMuted(muted);
      drawMusicIcon();
    });
    const drawMusicIcon = (): void => {
      music.icon.clear().fillStyle(muted ? 0xb8a898 : 0xf1d58b, 1);
      music.icon.fillRect(-36, -5, 5, 10).fillTriangle(-31, -7, -31, 7, -23, 0);
      music.icon.lineStyle(1.5, muted ? 0xb8a898 : 0xf1d58b, 1).strokeCircle(-22, 0, 9);
      if (muted) music.icon.lineBetween(-31, -9, -14, 9);
      music.label.setText(muted ? 'MUSIK MATI' : 'MUSIK');
    };
    drawMusicIcon();

    const pause = makeButton(GAME_WIDTH - 33, 56, 'JEDA', () => this.togglePause());
    pause.icon.fillStyle(0xf1d58b, 1).fillRect(-20, -6, 4, 12).fillRect(-13, -6, 4, 12);
  }

  private getActiveGameplayScene(): string {
    for (const name of GAMEPLAY_SCENES) {
      if (this.scene.isActive(name) || this.scene.isPaused(name)) return name;
    }
    return 'Era1944Scene';
  }

  private togglePause(): void {
    this.paused = !this.paused;
    const gameplay = this.getActiveGameplayScene();

    if (this.paused) {
      this.stateBeforePause = String(this.registry.get('nativeState') ?? gameplay.toLowerCase());
      this.scene.pause(gameplay);
      this.controls?.clearTouch();
      this.touchObjects.forEach((object) => object.setVisible(false));
      this.prompt?.setVisible(false);
      this.showPausePanel();
      this.registry.set('nativeState', 'paused');
    } else {
      this.scene.resume(gameplay);
      this.pausePanel?.destroy();
      this.pausePanel = undefined;
      this.pauseMenuItems = [];
      this.pauseButtons = [];
      this.touchObjects.forEach((object) => object.setVisible(!this.modal));
      this.registry.set('nativeState', this.stateBeforePause);
    }
  }

  private showPausePanel(): void {
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x040302, 0.8);
    const paper = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 506, 0xf4ead8, 0.98).setStrokeStyle(3, 0x6a4930);
    const title = this.add.text(GAME_WIDTH / 2, 43, 'WAKTU BERHENTI SEJENAK', {
      color: '#612a25', fontFamily: 'Cinzel, serif', fontSize: '22px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const options = this.registry.get('options') as GameOptions;
    const soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    const volume = (key: 'vol' | 'volMus' | 'volSfx', direction: number): void => {
      options[key] = Phaser.Math.Clamp(Math.round((options[key] + direction * 0.1) * 10) / 10, 0, 1);
      this.applyOptions(options, soundManager);
    };
    const cycle = (key: 'textSpd' | 'textScale', values: number[], direction: number): void => {
      const current = values.indexOf(options[key]);
      options[key] = values[Phaser.Math.Wrap((current < 0 ? 0 : current) + direction, 0, values.length)];
      this.applyOptions(options, soundManager);
    };
    this.pauseMenuItems = [
      { label: () => 'LANJUTKAN', action: () => this.togglePause() },
      { label: () => `VOLUME MASTER  ‹ ${Math.round(options.vol * 100)}% ›`, adjust: direction => volume('vol', direction) },
      { label: () => `MUSIK  ‹ ${Math.round(options.volMus * 100)}% ›`, adjust: direction => volume('volMus', direction) },
      { label: () => `EFEK & AMBIENSI  ‹ ${Math.round(options.volSfx * 100)}% ›`, adjust: direction => volume('volSfx', direction) },
      { label: () => `KECEPATAN TEKS  ‹ ${options.textSpd < 0.8 ? 'LAMBAT' : options.textSpd > 1.2 ? 'CEPAT' : 'SEDANG'} ›`, adjust: direction => cycle('textSpd', [0.6, 1, 1.7], direction) },
      { label: () => `UKURAN TEKS  ‹ ${options.textScale > 1 ? 'BESAR' : 'NORMAL'} ›`, adjust: direction => cycle('textScale', [1, 1.22], direction) },
      { label: () => `EFEK SINEMATIK  ‹ ${options.reduceMotion ? 'MATI' : 'ON'} ›`, adjust: () => { options.reduceMotion = !options.reduceMotion; this.applyOptions(options, soundManager); } },
      { label: () => 'R — ULANG DARI 1944', action: () => this.restartCycle() },
      { label: () => 'M — MENU UTAMA', action: () => this.leaveGameplay('TitleScene') },
    ];
    this.pauseSelection = 0;
    this.pauseButtons = this.pauseMenuItems.map((item, index) => {
      const button = this.add.text(GAME_WIDTH / 2, 82 + index * 48, item.label(), {
        backgroundColor: '#5a4a3c10', color: '#2b211a', fontFamily: 'Poppins, sans-serif',
        fontSize: '12px', align: 'center', fixedWidth: 460, padding: { x: 10, y: 9 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      button.on('pointerover', () => { this.pauseSelection = index; this.refreshPauseMenu(); });
      button.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        this.pauseSelection = index;
        if (item.adjust) item.adjust(pointer.x < GAME_WIDTH / 2 ? -1 : 1);
        else item.action?.();
        this.refreshPauseMenu();
      });
      return button;
    });
    this.pausePanel = this.add.container(0, 0, [shade, paper, title, ...this.pauseButtons]);
    this.refreshPauseMenu();
  }

  private applyOptions(options: GameOptions, soundManager?: SoundManager): void {
    this.registry.set('options', options);
    this.registry.set('reduceMotion', options.reduceMotion);
    if (options.reduceMotion) this.anims.pauseAll(); else this.anims.resumeAll();
    saveOptions(localStorage, options);
    soundManager?.updateVolumes();
    this.refreshPauseMenu();
  }

  private movePauseSelection(direction: number): void {
    this.pauseSelection = Phaser.Math.Wrap(this.pauseSelection + direction, 0, this.pauseMenuItems.length);
    (this.registry.get('soundManager') as SoundManager | undefined)?.playSelect();
    this.refreshPauseMenu();
  }

  private adjustPauseItem(direction: number): void {
    const item = this.pauseMenuItems[this.pauseSelection];
    if (!item?.adjust) return;
    item.adjust(direction);
    (this.registry.get('soundManager') as SoundManager | undefined)?.playSelect();
  }

  private activatePauseItem(): void {
    const item = this.pauseMenuItems[this.pauseSelection];
    if (!item) return;
    if (item.action) item.action();
    else item.adjust?.(1);
    (this.registry.get('soundManager') as SoundManager | undefined)?.playConfirm();
  }

  private refreshPauseMenu(): void {
    this.pauseButtons.forEach((button, index) => button
      .setText(this.pauseMenuItems[index]?.label() ?? '')
      .setStyle({
        backgroundColor: index === this.pauseSelection ? '#94342e' : '#5a4a3c10',
        color: index === this.pauseSelection ? '#fff8ea' : '#2b211a',
      }));
  }

  private restartCycle(): void {
    const save = this.registry.get('saveSystem') as { beginCycle: () => unknown };
    this.leaveGameplay('Era1944Scene', { run: save.beginCycle(), intro: true });
  }

  private leaveGameplay(target: string, data?: object): void {
    const manager = this.scene.manager;
    for (const name of GAMEPLAY_SCENES) {
      if (manager.isActive(name) || manager.isPaused(name)) manager.stop(name);
    }
    manager.stop('UIScene');
    manager.start(target, data);
  }

  private resetRuntimeState(): void {
    this.controls?.clearTouch();
    this.controls = undefined;
    this.eraTitleText = undefined;
    this.prompt = undefined;
    this.promptText = '';
    this.toast = undefined;
    this.inventoryContainer = undefined;
    this.inventorySlots = [];
    this.inventorySignature = '';
    this.run = undefined;
    this.touchObjects = [];
    this.pausePanel = undefined;
    this.pauseMenuItems = [];
    this.pauseButtons = [];
    this.pauseSelection = 0;
    this.paused = false;
    this.stateBeforePause = '';
    this.modal = false;
    this.modalOwned = false;
    this.suppressPauseOnce = false;
  }
}
