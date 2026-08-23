import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { StoryRunner } from '../narrative/StoryRunner';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

type MenuItem = {
  label: string;
  disabled?: () => boolean;
  action: () => void;
};

export class TitleScene extends Phaser.Scene {
  private save!: SaveSystem;
  private runner!: StoryRunner;
  private items: MenuItem[] = [];
  private buttons: Phaser.GameObjects.Text[] = [];
  private selected = 0;
  private confirmPanel?: Phaser.GameObjects.Container;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private enter?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.runner = this.registry.get('storyRunner') as StoryRunner;
    this.registry.set('nativeState', 'title');
    this.drawCover();
    this.createMenu();
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.enter = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }

  update(): void {
    if (this.confirmPanel || !this.cursors || !this.enter) return;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.moveSelection(-1);
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) this.moveSelection(1);
    if (Phaser.Input.Keyboard.JustDown(this.enter) || Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
      this.activate(this.selected);
    }
  }

  snapshot(): Record<string, unknown> {
    return {
      titleInteractive: true,
      continueEnabled: Boolean(this.save.data.game),
      menu: this.items.map((item) => ({ label: item.label, disabled: Boolean(item.disabled?.()) })),
    };
  }

  private drawCover(): void {
    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'title-bg-color')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    if (!this.registry.get('reduceMotion')) {
      this.tweens.add({ targets: background, scaleX: 1.025, scaleY: 1.025, duration: 7000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.add.rectangle(GAME_WIDTH / 2, 106, GAME_WIDTH, 212, 0x02050d, 0.54);
    this.add.rectangle(GAME_WIDTH / 2, 442, GAME_WIDTH, 196, 0x010207, 0.82);
    this.add.text(GAME_WIDTH / 2, 86, 'HEARTS ACROSS TIME', {
      color: '#f6d57b', fontFamily: 'Cinzel, serif', fontSize: '47px', fontStyle: 'bold',
      stroke: '#21130c', strokeThickness: 7, shadow: { color: '#d89a42', blur: 18, fill: true },
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 139, 'BREAK THE LOOP', {
      color: '#fffaf0', fontFamily: 'Poppins, sans-serif', fontSize: '14px', letterSpacing: 7,
      stroke: '#090b14', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 184, 'Kisah cinta, waktu, dan pengorbanan • 1944 – 1968 – 1999 – 2088', {
      color: '#f5f0e8bb', fontFamily: 'Patrick Hand, sans-serif', fontSize: '17px',
    }).setOrigin(0.5);
  }

  private isBonusUnlocked(): boolean {
    const endings = this.save.data.endings || {};
    return Boolean(endings['true'] || Object.keys(endings).length >= 6);
  }

  private createMenu(): void {
    const bonusUnlocked = this.isBonusUnlocked();
    const endingCount = Object.keys(this.save.data.endings || {}).length;

    this.items = [
      { label: 'LANJUTKAN', disabled: () => !this.save.data.game, action: () => this.continueGame() },
      { label: 'SIKLUS BARU', action: () => this.newCycle() },
      { label: 'PUTAR ULANG INTRO', action: () => this.scene.start('IntroScene') },
      {
        label: bonusUnlocked ? 'GAMEPLAY TERAKHIR 2088' : `GAMEPLAY TERAKHIR 🔒 ${endingCount}/6`,
        disabled: () => !bonusUnlocked,
        action: () => this.scene.start('Bonus2088Scene'),
      },
    ];

    if (!this.save.data.game) this.selected = 1;
    this.buttons = this.items.map((item, index) => {
      const button = this.add.text(GAME_WIDTH / 2, 308 + index * 48, item.label, {
        backgroundColor: '#080a12dd', color: '#fffdf2', fontFamily: 'Cinzel, serif',
        fontSize: '14px', align: 'center', fixedWidth: 330,
        padding: { x: 16, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      button.on('pointerover', () => { if (!item.disabled?.()) { this.selected = index; this.refreshMenu(); } });
      button.on('pointerup', () => this.activate(index));
      return button;
    });
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, '↑ ↓ / ENTER • sentuh menu • ESC/P untuk jeda saat bermain', {
      color: '#f5f0e899', fontFamily: 'Poppins, sans-serif', fontSize: '10px',
    }).setOrigin(0.5);
    this.refreshMenu();
  }

  private moveSelection(direction: number): void {
    do this.selected = Phaser.Math.Wrap(this.selected + direction, 0, this.items.length);
    while (this.items[this.selected]?.disabled?.());
    this.refreshMenu();
  }

  private activate(index: number): void {
    const item = this.items[index];
    if (!item || item.disabled?.()) return;
    this.selected = index;
    this.refreshMenu();
    item.action();
  }

  private refreshMenu(): void {
    this.buttons.forEach((button, index) => {
      const disabled = Boolean(this.items[index]?.disabled?.());
      const selected = index === this.selected && !disabled;
      button.setStyle({
        backgroundColor: selected ? '#d3a848ee' : '#080a12dd',
        color: disabled ? '#f5f0e855' : '#fffdf2',
      });
      button.setText(`${selected ? '▶ ' : ''}${this.items[index]?.label ?? ''}`);
    });
  }

  private continueGame(): void {
    const saved = this.save.data.game;
    if (!saved) return;
    const era = saved.era || '1944';

    if (era === '1968') {
      this.scene.start('Era1968Scene', { run: saved.S, playerX: saved.playerX });
    } else if (era === '1999') {
      this.scene.start('Era1999Scene', { run: saved.S, playerX: saved.playerX });
    } else {
      this.start1944(saved.S, saved.playerX);
    }
  }

  private newCycle(): void {
    if (!this.save.data.game) {
      this.scene.start('PrologueScene');
      return;
    }
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x010207, 0.82);
    const paper = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 190, 0xf4ead8).setStrokeStyle(3, 0x6a4930);
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 48, 'TIMPA AUTOSAVE SIKLUS AKTIF?', {
      color: '#7a2925', fontFamily: 'Cinzel, serif', fontSize: '20px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const yes = this.confirmButton(GAME_WIDTH / 2 - 100, GAME_HEIGHT / 2 + 38, 'YA, MULAI BARU', () => {
      this.confirmPanel?.destroy();
      this.confirmPanel = undefined;
      this.scene.start('PrologueScene');
    });
    const no = this.confirmButton(GAME_WIDTH / 2 + 120, GAME_HEIGHT / 2 + 38, 'BATAL', () => {
      this.confirmPanel?.destroy();
      this.confirmPanel = undefined;
    });
    this.confirmPanel = this.add.container(0, 0, [shade, paper, title, yes, no]);
  }

  private confirmButton(x: number, y: number, label: string, action: () => void): Phaser.GameObjects.Text {
    return this.add.text(x, y, label, {
      backgroundColor: '#94342e', color: '#fff8ea', fontFamily: 'Poppins, sans-serif',
      fontSize: '12px', padding: { x: 16, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', action);
  }

  private start1944(run: RunState, playerX?: number): void {
    if (!this.runner.transition('title', '1944', run)) return;
    this.scene.start('Era1944Scene', { run, playerX });
  }
}
