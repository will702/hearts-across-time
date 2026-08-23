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

export class UIScene extends Phaser.Scene {
  private controls?: InputSystem;
  private eraTitleText?: Phaser.GameObjects.Text;
  private prompt?: Phaser.GameObjects.Text;
  private toast?: Phaser.GameObjects.Text;
  private inventoryText?: Phaser.GameObjects.Text;
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
      color: '#f7d984', fontFamily: 'Cinzel, serif', fontSize: '16px',
      stroke: '#140d08', strokeThickness: 4,
    });
    this.add.text(20, 43, 'JEJAK WAKTU TERSIMPAN OTOMATIS', {
      color: '#f5f0e8aa', fontFamily: 'Poppins, sans-serif', fontSize: '10px', letterSpacing: 1,
    });
    this.prompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 62, '', {
      backgroundColor: '#100c09dd', color: '#fff4d1', fontFamily: 'Patrick Hand, sans-serif',
      fontSize: '18px', padding: { x: 18, y: 10 }, align: 'center',
    }).setOrigin(0.5).setVisible(false);
    this.inventoryText = this.add.text(GAME_WIDTH - 230, 58, '', {
      backgroundColor: '#07090cb8', color: '#f7d984', fontFamily: 'Poppins, sans-serif',
      fontSize: '12px', padding: { x: 10, y: 7 }, fixedWidth: 210, align: 'center',
    }).setVisible(false);
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
    this.prompt?.setText(text).setVisible(Boolean(text) && !this.paused && !this.modal);
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
    this.toast = this.add.text(GAME_WIDTH / 2, 104, text, {
      backgroundColor: '#f4ead8ee', color: '#5f2924', fontFamily: 'Patrick Hand, sans-serif',
      fontSize: '17px', padding: { x: 18, y: 10 }, align: 'center',
    }).setOrigin(0.5);
    this.time.delayedCall(duration, () => { this.toast?.destroy(); this.toast = undefined; });
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
    hold(62, '◀', 'left');
    hold(132, '▶', 'right');
    const action = this.add.text(GAME_WIDTH - 78, GAME_HEIGHT - 58, 'PERIKSA', {
      backgroundColor: '#94342ecc', color: '#fff8ea', fontFamily: 'Poppins, sans-serif',
      fontSize: '12px', padding: { x: 16, y: 14 },
    }).setOrigin(0.5).setInteractive();
    action.on('pointerdown', () => this.controls?.triggerTouch('interact'));
    this.touchObjects.push(action);
    this.input.on('pointerup', () => this.controls?.clearTouchMovement());
  }

  private refreshInventory(): void {
    if (!this.run || !this.inventoryText) return;
    const items = [
      ['watch', '◷'], ['flower', '✿'], ['water_gem', '◆'], ['arthur_photo', '▧'],
    ] as const;
    const owned = items.filter(([key]) => Boolean(this.run?.inventory[key]));
    this.inventoryText.setVisible(owned.length > 0).setText(`TAS   ${items.map(([key, icon]) => this.run?.inventory[key] ? icon : '·').join('   ')}`);
  }

  private createTopButtons(): void {
    const soundManager = this.registry.get('soundManager') as { setMuted: (m: boolean) => void; muted: boolean } | undefined;
    let muted = soundManager?.muted ?? false;

    const muteBtn = this.add.text(GAME_WIDTH - 72, 30, muted ? '🔇' : '🔊', {
      backgroundColor: '#0b0a08aa', color: '#f5f0e8', fontSize: '14px', padding: { x: 7, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    muteBtn.on('pointerup', () => {
      muted = !muted;
      muteBtn.setText(muted ? '🔇' : '🔊');
      soundManager?.setMuted(muted);
    });

    const pauseBtn = this.add.text(GAME_WIDTH - 30, 30, 'Ⅱ', {
      backgroundColor: '#0b0a08aa', color: '#f5f0e8', fontSize: '15px', padding: { x: 8, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerup', () => this.togglePause());
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
    const title = this.add.text(GAME_WIDTH / 2, 43, 'GAME DIJEDA', {
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
      { label: () => '▶ LANJUTKAN', action: () => this.togglePause() },
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
    this.toast = undefined;
    this.inventoryText = undefined;
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
    this.pauseKeys = undefined;
  }
}
