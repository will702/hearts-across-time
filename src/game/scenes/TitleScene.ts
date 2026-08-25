import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { allEndingsUnlocked, type RunState, type SaveSystem } from '../systems/SaveSystem';

type MenuItem = {
  label: string;
  disabled?: () => boolean;
  action: () => void;
};

export class TitleScene extends Phaser.Scene {
  private save!: SaveSystem;
  private items: MenuItem[] = [];
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectionMark?: Phaser.GameObjects.Rectangle;
  private selected = 0;
  private confirmPanel?: Phaser.GameObjects.Container;
  private confirmYes?: Phaser.GameObjects.Text;
  private confirmNo?: Phaser.GameObjects.Text;
  private confirmChoice: 'yes' | 'no' = 'no';
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private enter?: Phaser.Input.Keyboard.Key;
  private escape?: Phaser.Input.Keyboard.Key;
  private yesKey?: Phaser.Input.Keyboard.Key;
  private noKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.registry.set('nativeState', 'title');

    const soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    soundManager?.setAmbience('title');

    this.drawCover();
    this.createMenu();
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.enter = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escape = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.yesKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Y);
    this.noKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.N);
  }

  update(): void {
    if (this.confirmPanel) {
      this.updateConfirmation();
      return;
    }
    if (!this.cursors || !this.enter) return;
    const soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.moveSelection(-1);
      soundManager?.playSelect();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.moveSelection(1);
      soundManager?.playSelect();
    }
    if (Phaser.Input.Keyboard.JustDown(this.enter) || Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
      soundManager?.playConfirm();
      this.activate(this.selected);
    }
  }

  snapshot(): Record<string, unknown> {
    return {
      titleInteractive: true,
      menuSelection: this.selected,
      continueEnabled: Boolean(this.save.data.game),
      confirmation: this.confirmPanel ? this.confirmChoice : null,
      menu: this.items.map((item) => ({ label: item.label, disabled: Boolean(item.disabled?.()) })),
    };
  }

  private drawCover(): void {
    const coverKey = this.textures.exists('title-cover') ? 'title-cover' : 'title-bg-color';
    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, coverKey)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    if (!this.registry.get('reduceMotion')) {
      this.tweens.add({
        targets: background,
        scaleX: background.scaleX * 1.025,
        scaleY: background.scaleY * 1.025,
        duration: 7000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
    const veil = this.add.graphics();
    veil.fillGradientStyle(0x02050d, 0x02050d, 0x02050d, 0x02050d, 0.92, 0.18, 0.92, 0.18);
    veil.fillRect(0, 0, 610, GAME_HEIGHT);
    this.add.rectangle(67, 61, 38, 2, 0xd7b45c, 0.9).setOrigin(0, 0.5);
    this.add.text(66, 79, 'HEARTS\nACROSS TIME', {
      color: '#f4d98d', fontFamily: 'Cinzel, serif', fontSize: '39px', fontStyle: 'bold',
      lineSpacing: -8, stroke: '#130d0a', strokeThickness: 5,
    }).setOrigin(0, 0);
    this.add.text(69, 171, 'BREAK THE LOOP', {
      color: '#fffaf0', fontFamily: 'Poppins, sans-serif', fontSize: '11px', letterSpacing: 5,
    }).setOrigin(0, 0.5);
    this.add.text(68, 207, 'Sebuah kisah tentang cinta yang menolak dilupakan.', {
      color: '#e8dfd0cc', fontFamily: 'Patrick Hand, sans-serif', fontSize: '17px',
    }).setOrigin(0, 0.5);
    this.add.text(68, 232, '1944  /  1968  /  1999  /  2088', {
      color: '#cbbda699', fontFamily: 'Poppins, sans-serif', fontSize: '9px', letterSpacing: 2,
    }).setOrigin(0, 0.5);
  }

  private isBonusUnlocked(): boolean {
    return allEndingsUnlocked(this.save.data.endings || {});
  }

  private createMenu(): void {
    const bonusUnlocked = this.isBonusUnlocked();
    const endingCount = Object.keys(this.save.data.endings || {}).length;

    this.items = [
      { label: 'LANJUTKAN', disabled: () => !this.save.data.game, action: () => this.continueGame() },
      { label: 'SIKLUS BARU', action: () => this.newCycle() },
      { label: 'PUTAR ULANG INTRO', action: () => this.scene.start('IntroScene') },
      {
        label: bonusUnlocked ? 'GAMEPLAY TERAKHIR 2088' : `GAMEPLAY TERAKHIR 2088  ${endingCount}/6 AKHIR`,
        disabled: () => !bonusUnlocked,
        action: () => this.scene.start('Bonus2088Scene'),
      },
    ];

    if (!this.save.data.game) this.selected = 1;
    this.add.text(68, 277, 'PILIH BABAK', {
      color: '#d7b45c', fontFamily: 'Poppins, sans-serif', fontSize: '9px', letterSpacing: 2,
    });
    this.selectionMark = this.add.rectangle(68, 310, 3, 28, 0xd7b45c).setOrigin(0, 0.5);
    this.buttons = this.items.map((item, index) => {
      const button = this.add.text(82, 310 + index * 43, item.label, {
        color: '#fffdf2', fontFamily: 'Cinzel, serif', fontSize: '13px', fixedWidth: 360,
        padding: { x: 0, y: 7 },
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      button.on('pointerover', () => { if (!item.disabled?.()) { this.selected = index; this.refreshMenu(); } });
      button.on('pointerup', () => this.activate(index));
      return button;
    });
    this.add.text(68, GAME_HEIGHT - 25, '↑ ↓ memilih   ENTER membuka   ESC / P jeda', {
      color: '#d8cfbf88', fontFamily: 'Poppins, sans-serif', fontSize: '9px', letterSpacing: 0.4,
    }).setOrigin(0, 0.5);
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
    this.selectionMark?.setY(310 + this.selected * 43);
    this.buttons.forEach((button, index) => {
      const disabled = Boolean(this.items[index]?.disabled?.());
      const selected = index === this.selected && !disabled;
      button.setStyle({
        color: disabled ? '#c9c0b050' : (selected ? '#f4d98d' : '#e9e2d8c0'),
      });
      button.setX(selected ? 88 : 82).setText(this.items[index]?.label ?? '');
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
    const yes = this.confirmButton(GAME_WIDTH / 2 - 100, GAME_HEIGHT / 2 + 38, 'YA, MULAI BARU', () => this.closeConfirmation(true));
    const no = this.confirmButton(GAME_WIDTH / 2 + 120, GAME_HEIGHT / 2 + 38, 'BATAL', () => this.closeConfirmation(false));
    yes.on('pointerover', () => { this.confirmChoice = 'yes'; this.refreshConfirmation(); });
    no.on('pointerover', () => { this.confirmChoice = 'no'; this.refreshConfirmation(); });
    this.confirmChoice = 'no';
    this.confirmYes = yes;
    this.confirmNo = no;
    this.confirmPanel = this.add.container(0, 0, [shade, paper, title, yes, no]);
    this.refreshConfirmation();
  }

  private updateConfirmation(): void {
    if (!this.cursors || !this.enter) return;
    const soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.confirmChoice = 'yes';
      soundManager?.playSelect();
      this.refreshConfirmation();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.confirmChoice = 'no';
      soundManager?.playSelect();
      this.refreshConfirmation();
      return;
    }
    if (this.yesKey && Phaser.Input.Keyboard.JustDown(this.yesKey)) {
      soundManager?.playConfirm();
      this.closeConfirmation(true);
      return;
    }
    if ((this.noKey && Phaser.Input.Keyboard.JustDown(this.noKey))
      || (this.escape && Phaser.Input.Keyboard.JustDown(this.escape))) {
      soundManager?.playSelect();
      this.closeConfirmation(false);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.enter)) {
      soundManager?.playConfirm();
      this.closeConfirmation(this.confirmChoice === 'yes');
    }
  }

  private refreshConfirmation(): void {
    this.confirmYes?.setStyle({
      backgroundColor: this.confirmChoice === 'yes' ? '#d3a848' : '#94342e',
      color: '#fff8ea',
    });
    this.confirmNo?.setStyle({
      backgroundColor: this.confirmChoice === 'no' ? '#d3a848' : '#94342e',
      color: '#fff8ea',
    });
  }

  private closeConfirmation(startNewCycle: boolean): void {
    this.confirmPanel?.destroy();
    this.confirmPanel = undefined;
    this.confirmYes = undefined;
    this.confirmNo = undefined;
    if (startNewCycle) this.scene.start('PrologueScene');
  }

  private confirmButton(x: number, y: number, label: string, action: () => void): Phaser.GameObjects.Text {
    return this.add.text(x, y, label, {
      backgroundColor: '#94342e', color: '#fff8ea', fontFamily: 'Poppins, sans-serif',
      fontSize: '12px', padding: { x: 16, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', action);
  }

  private start1944(run: RunState, playerX?: number): void {
    this.scene.start('Era1944Scene', { run, playerX });
  }
}
