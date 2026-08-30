import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { LORE_IDS } from '../narrative/lore';
import { allEndingsUnlocked, type RunState, type SaveSystem } from '../systems/SaveSystem';
import { addPaperPanel } from '../ui/paper';
import { CSS, FONT, GOLD, GOLD_PALE, RED } from '../ui/theme';

type MenuItem = {
  label: string;
  disabled?: () => boolean;
  action: () => void;
};

const ENDING_TOTAL = 6;
const CYCLE_SECONDS = 6.4;

/** Goresan glitch hanya saat lapisan warna/monokrom bertukar (titleSignalState legacy). */
function titleSignalState(t: number): { mono: boolean; glitch: number } {
  const ph = t % CYCLE_SECONDS;
  const edge = Math.min(ph, Math.abs(ph - CYCLE_SECONDS / 2), CYCLE_SECONDS - ph);
  return { mono: ph >= CYCLE_SECONDS / 2, glitch: Phaser.Math.Clamp(1 - edge / 0.18, 0, 1) };
}

export class TitleScene extends Phaser.Scene {
  private save!: SaveSystem;
  private items: MenuItem[] = [];
  private bgLayer?: Phaser.GameObjects.Container;
  private bgImages: Phaser.GameObjects.Image[] = [];
  private signalFx?: Phaser.GameObjects.Graphics;
  private wordmarkGlow?: Phaser.GameObjects.Graphics;
  private menuRows: Array<{ bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; row: Phaser.GameObjects.Container }> = [];
  private selected = 0;
  private confirmPanel?: Phaser.GameObjects.Container;
  private confirmYes?: Phaser.GameObjects.Rectangle;
  private confirmNo?: Phaser.GameObjects.Rectangle;
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

  update(time: number): void {
    this.animateCover(time / 1000);

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

  /** Sampul legacy: swap warna/monokrom + glitch + Ken Burns pelan + wordmark emas. */
  private drawCover(): void {
    this.bgLayer = this.add.container(0, 0);

    const keys = ['title-bg-color', 'title-bg-mono', 'title-cover'];
    for (const key of keys) {
      if (this.textures.exists(key)) {
        const image = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key);
        this.bgLayer.add(image);
        this.bgImages.push(image);
      }
    }
    if (!this.bgImages.length) {
      const fallback = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1410);
      this.bgLayer.add(fallback);
    }

    // lapisan gelap Figma: judul kontras, footer menyatu
    const gradients = this.add.graphics();
    gradients.fillGradientStyle(0x02050d, 0x02050d, 0x02050d, 0x02050d, 0.72, 0.72, 0.12, 0);
    gradients.fillRect(0, 0, GAME_WIDTH, 210);
    gradients.fillGradientStyle(0x02040a, 0x02040a, 0x010207, 0x010207, 0, 0, 0.7, 0.96);
    gradients.fillRect(0, 330, GAME_WIDTH, GAME_HEIGHT - 330);

    // glow emas di belakang wordmark (radial legacy 250,150)
    this.wordmarkGlow = this.add.graphics();
    this.wordmarkGlow.fillStyle(0xffd76e, 0.15);
    this.wordmarkGlow.fillCircle(250, 150, 210);
    this.wordmarkGlow.fillStyle(0xffd76e, 0.08);
    this.wordmarkGlow.fillCircle(250, 150, 140);

    if (this.textures.exists('title-wordmark')) {
      const mark = this.add.image(15, 80, 'title-wordmark').setOrigin(0, 0);
      const scale = 500 / mark.width;
      mark.setScale(scale);
      this.add.container(0, 0, mark); // keep above glow
    }

    this.signalFx = this.add.graphics();
  }

  private animateCover(t: number): void {
    const reduce = Boolean(this.registry.get('reduceMotion'));
    const sig = titleSignalState(t);
    const mot = reduce ? 0 : 1;
    const zoom = 1.015 + mot * 0.012 * Math.sin(t * 0.18);
    const panX = mot * Math.sin(t * 0.13) * 5;
    const panY = mot * Math.cos(t * 0.16) * 3;

    const showMono = !reduce && sig.mono && this.bgImages.length > 1;
    this.bgImages.forEach((image) => {
      const key = image.texture.key;
      const isColor = key === 'title-bg-color' || (key === 'title-cover' && this.bgImages.length === 1);
      const visible = this.bgImages.length === 1 || (showMono ? key === 'title-bg-mono' : isColor);
      image.setVisible(visible);
      if (!image.width) return;
      const base = Math.max(GAME_WIDTH / image.width, GAME_HEIGHT / image.height);
      image.setScale(base * zoom);
      image.setPosition(GAME_WIDTH / 2 + panX, GAME_HEIGHT / 2 + panY);
    });

    // denyut glow wordmark
    const pul = mot ? 0.5 + 0.5 * Math.sin(t * 1.6) : 0.5;
    this.wordmarkGlow?.setAlpha(0.7 + pul * 0.5 + sig.glitch * 0.3);

    // pita glitch pada tepi pergantian warna/mono (drawTitleSignal)
    this.drawTitleSignal(t, reduce ? 0 : sig.glitch);

    // detak menu aktif (heartbeat scale) — hanya baris terpilih
    const beat = mot ? 1 + 0.024 * (0.5 + 0.5 * Math.sin(t * 2.05)) : 1;
    this.menuRows.forEach((row, index) => {
      const isSelected = index === this.selected && !this.items[index]?.disabled?.();
      row.row.setScale(isSelected ? beat : 1);
    });
  }

  private drawTitleSignal(t: number, glitch: number): void {
    const g = this.signalFx;
    if (!g) return;
    g.clear();
    if (glitch <= 0) return;
    const bands = [[24, 10, -9], [79, 7, 12], [126, 16, -15], [183, 8, 10], [248, 11, -7], [337, 6, 13], [421, 13, -11], [487, 7, 8]];
    bands.forEach((band, i) => {
      const y = band[0], h = band[1], dx = band[2] * glitch;
      g.fillStyle(i % 2 ? 0xe64d76 : 0x47d9de, 0.2 * glitch);
      g.fillRect(dx, y, GAME_WIDTH, h);
    });
    g.fillStyle(0xe9c66b, 0.16 * glitch);
    g.fillRect(0, 116 + Math.sin(t * 31) * 14, GAME_WIDTH, 2 + 4 * glitch);
    g.fillStyle(0x07101f, 0.2 * glitch);
    g.fillRect(0, 276 + Math.cos(t * 23) * 38, GAME_WIDTH, 3);
  }

  private isBonusUnlocked(): boolean {
    return allEndingsUnlocked(this.save.data.endings || {});
  }

  private loreFoundCount(): number {
    return LORE_IDS.filter(id => Boolean(this.save.data.inspected?.[id])).length;
  }

  /** Menu legacy: kolom kiri + panel bonus terpisah kanan-bawah. */
  private createMenu(): void {
    const bonusUnlocked = this.isBonusUnlocked();
    const endingCount = Object.keys(this.save.data.endings || {}).length;

    this.items = [
      { label: 'LANJUTKAN', disabled: () => !this.save.data.game, action: () => this.continueGame() },
      { label: 'SIKLUS BARU', action: () => this.newCycle() },
      { label: 'PUTAR ULANG INTRO', action: () => this.scene.start('IntroScene', { replay: true }) },
      {
        label: bonusUnlocked ? 'GAMEPLAY TERAKHIR' : `GAMEPLAY TERAKHIR  TERTUTUP ${endingCount}/${ENDING_TOTAL}`,
        disabled: () => !bonusUnlocked,
        action: () => this.scene.start('Bonus2088Scene'),
      },
    ];

    this.selected = this.save.data.game ? 0 : 1;

    const leftX = 132, leftY = 312, leftW = 390, leftH = 34;
    const bonusX = 754, bonusY = 440, bonusW = 188, bonusH = 40;
    this.menuRows = this.items.map((item, index) => {
      const bonus = index === 3;
      const x = bonus ? bonusX : leftX;
      const y = bonus ? bonusY : leftY + index * 40;
      const w = bonus ? bonusW : leftW;
      const h = bonus ? bonusH : leftH;

      const row = this.add.container(x + w / 2, y + h / 2);
      const bg = this.add.rectangle(0, 0, w, h, 0x080a12, 0.72).setStrokeStyle(1, GOLD, 0.48)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(0, 0, item.label, {
        color: '#FFFDF2',
        fontFamily: FONT.TITLE,
        fontSize: bonus ? '10px' : '13px',
        align: 'center',
        fixedWidth: w - 12,
      }).setOrigin(0.5);
      row.add([bg, label]);

      bg.on('pointerover', () => {
        if (!item.disabled?.()) {
          this.selected = index;
          this.refreshMenu();
        }
      });
      bg.on('pointerup', () => this.activate(index));
      return { bg, label, row };
    });

    this.createProgressReadouts(endingCount);
    this.refreshMenu();
  }

  /** Baris progres kanan + autosave kiri + hint bawah (copy legacy). */
  private createProgressReadouts(endingCount: number): void {
    const endings = this.save.data.endings || {};
    const trueFound = Boolean(endings.true);
    const loreCount = this.loreFoundCount();

    this.add.text(GAME_WIDTH - 22, 397, `ENDING ${endingCount}/${ENDING_TOTAL}${trueFound ? '  * SEJATI' : ''}`, {
      color: endingCount >= ENDING_TOTAL ? '#F7D984' : 'rgba(247,242,226,.76)',
      fontFamily: FONT.META,
      fontSize: '13px',
    }).setOrigin(1, 0.5);
    this.add.text(GAME_WIDTH - 22, 424, `✦ KISAH LENKAP ${loreCount}/${LORE_IDS.length}`, {
      color: loreCount >= LORE_IDS.length ? '#F1D58B' : 'rgba(247,242,226,.58)',
      fontFamily: FONT.META,
      fontSize: '11px',
    }).setOrigin(1, 0.5);

    if (this.save.data.game?.era) {
      this.add.text(54, 516, `AUTOSAVE • ${this.save.data.game.era}`, {
        color: '#F1D58B', fontFamily: FONT.META, fontSize: '12px',
      });
    } else {
      this.add.text(54, 516, `PUZZLE WAKTU ${endingCount}/${ENDING_TOTAL}`, {
        color: endingCount >= ENDING_TOTAL ? '#F7D984' : 'rgba(247,242,226,.66)',
        fontFamily: FONT.META, fontSize: '12px',
      });
    }
    const isTouch = this.sys.game.device.input.touch;
    this.add.text(GAME_WIDTH / 2, 522, isTouch ? 'KETUK MENU UNTUK MEMILIH' : '↑ ↓ pilih  •  ENTER konfirmasi', {
      color: 'rgba(247,242,226,.72)', fontFamily: FONT.META, fontSize: '12px',
    }).setOrigin(0.5);
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
    this.menuRows.forEach((row, index) => {
      const disabled = Boolean(this.items[index]?.disabled?.());
      const selected = index === this.selected && !disabled;
      row.bg.setFillStyle(selected ? 0xd3a848 : 0x080a12, selected ? 0.9 : 0.72);
      row.bg.setStrokeStyle(selected ? 2 : 1, selected ? GOLD_PALE : GOLD, selected ? 1 : 0.48);
      const item = this.items[index];
      const prefix = selected ? '▸ ' : '';
      row.label.setText(prefix + (item?.label ?? ''));
      row.label.setColor(disabled ? 'rgba(245,240,232,.3)' : '#FFFDF2');
      row.label.setFontStyle(selected ? 'bold' : 'normal');
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
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020308, 0.82);
    const paper = addPaperPanel(this, 250, 235, 460, 170, { radius: 8 });
    const title = this.add.text(GAME_WIDTH / 2, 278, 'TIMPA AUTOSAVE SIKLUS AKTIF?', {
      color: CSS.red, fontFamily: FONT.UI, fontSize: '20px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const body = this.add.text(GAME_WIDTH / 2, 308, 'Progres siklus saat ini akan dimulai ulang dari 1944.', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '15px',
    }).setOrigin(0.5);
    const yes = this.confirmButton(308, 338, 160, 38, 'YA, MULAI BARU', () => this.closeConfirmation(true));
    const no = this.confirmButton(492, 338, 160, 38, 'BATAL', () => this.closeConfirmation(false));
    yes.rect.on('pointerover', () => { this.confirmChoice = 'yes'; this.refreshConfirmation(); });
    no.rect.on('pointerover', () => { this.confirmChoice = 'no'; this.refreshConfirmation(); });
    this.confirmChoice = 'no';
    this.confirmYes = yes.rect;
    this.confirmNo = no.rect;
    this.confirmPanel = this.add.container(0, 0, [
      shade,
      paper,
      title,
      body,
      yes.rect,
      yes.label,
      no.rect,
      no.label,
    ]);
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
    this.confirmYes?.setFillStyle(this.confirmChoice === 'yes' ? RED : 0x6a5b4b, 1);
    this.confirmNo?.setFillStyle(this.confirmChoice === 'no' ? RED : 0x6a5b4b, 1);
  }

  private closeConfirmation(startNewCycle: boolean): void {
    this.confirmPanel?.destroy();
    this.confirmPanel = undefined;
    this.confirmYes = undefined;
    this.confirmNo = undefined;
    if (startNewCycle) this.scene.start('PrologueScene');
  }

  private confirmButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    action: () => void,
  ): { rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text } {
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x6a5b4b)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', action);
    const labelText = this.add.text(x + w / 2, y + h / 2, label, {
      color: '#FFF8EA', fontFamily: FONT.UI, fontSize: '13px',
    }).setOrigin(0.5);
    return { rect, label: labelText };
  }

  private start1944(run: RunState, playerX?: number): void {
    this.scene.start('Era1944Scene', { run, playerX });
  }
}
