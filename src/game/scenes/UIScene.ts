import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { InputSystem } from '../systems/InputSystem';

type UIData = { input: InputSystem };

export class UIScene extends Phaser.Scene {
  private controls?: InputSystem;
  private prompt?: Phaser.GameObjects.Text;
  private toast?: Phaser.GameObjects.Text;
  private touchObjects: Phaser.GameObjects.Text[] = [];
  private pausePanel?: Phaser.GameObjects.Container;
  private paused = false;
  private modal = false;
  private pauseKeys?: { ESC: Phaser.Input.Keyboard.Key; P: Phaser.Input.Keyboard.Key };

  constructor() {
    super('UIScene');
  }

  create(data: UIData): void {
    this.controls = data.input;
    this.add.text(20, 18, 'BABAK 1 — GARIS DEPAN, 1944', {
      color: '#f7d984', fontFamily: 'Cinzel, serif', fontSize: '16px',
      stroke: '#140d08', strokeThickness: 4,
    });
    this.add.text(20, 43, 'ARCADE PHYSICS • AUTOSAVE', {
      color: '#f5f0e8aa', fontFamily: 'Poppins, sans-serif', fontSize: '10px', letterSpacing: 1,
    });
    this.prompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 62, '', {
      backgroundColor: '#100c09dd', color: '#fff4d1', fontFamily: 'Patrick Hand, sans-serif',
      fontSize: '18px', padding: { x: 18, y: 10 }, align: 'center',
    }).setOrigin(0.5).setVisible(false);

    const touchMode = this.sys.game.device.input.touch || new URLSearchParams(location.search).get('touch') === '1';
    if (touchMode) this.createTouchControls();
    this.createPauseButton();
    this.pauseKeys = this.input.keyboard?.addKeys('ESC,P') as typeof this.pauseKeys;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.controls?.clearTouch());
  }

  update(): void {
    if (!this.pauseKeys) return;
    if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.ESC) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.P)) {
      this.togglePause();
    }
  }

  setPrompt(text = ''): void {
    this.prompt?.setText(text).setVisible(Boolean(text) && !this.paused && !this.modal);
  }

  setModal(on: boolean): void {
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

  private createPauseButton(): void {
    const button = this.add.text(GAME_WIDTH - 30, 22, 'Ⅱ', {
      backgroundColor: '#0b0a08aa', color: '#f5f0e8', fontSize: '16px', padding: { x: 9, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    button.on('pointerup', () => this.togglePause());
  }

  private togglePause(): void {
    this.paused = !this.paused;
    const gameplay = this.scene.isActive('WatchRepairScene') || this.scene.isPaused('WatchRepairScene')
      ? 'WatchRepairScene'
      : 'Era1944Scene';
    if (this.paused) {
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
      this.touchObjects.forEach((object) => object.setVisible(!this.modal));
      this.registry.set('nativeState', gameplay === 'WatchRepairScene' ? 'watchrepair' : 'era1944');
    }
  }

  private showPausePanel(): void {
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x040302, 0.8);
    const paper = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 420, 190, 0xf4ead8, 0.98).setStrokeStyle(3, 0x6a4930);
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 48, 'GAME DIJEDA', {
      color: '#612a25', fontFamily: 'Cinzel, serif', fontSize: '25px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const resume = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 28, 'LANJUTKAN', {
      backgroundColor: '#94342e', color: '#fff8ea', fontFamily: 'Poppins, sans-serif',
      fontSize: '14px', padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.togglePause());
    this.pausePanel = this.add.container(0, 0, [shade, paper, title, resume]);
  }
}
