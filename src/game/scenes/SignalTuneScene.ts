import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { MICROFILM_STARTS, MICROFILM_TARGETS, microfilmHint } from '../minigames/challengeRules';
import type { RunState, SaveSystem } from '../systems/SaveSystem';
import { addPaperPanel } from '../ui/paper';
import { CSS, FONT } from '../ui/theme';

export type SignalTuneData = { run: RunState; save: SaveSystem; onComplete: () => void };
type Approach = 'empathy' | 'logic';

export class SignalTuneScene extends Phaser.Scene {
  private tuneData!: SignalTuneData;
  private soundManager?: SoundManager;
  private stage: 'choose' | 'play' | 'success' = 'choose';
  private approach: Approach = 'empathy';
  private selectedApproach = 0;
  private selectedLayer = 0;
  private positions: number[] = [...MICROFILM_STARTS];
  private locked = [false, false, false];
  private misses = 0;
  private assisted = false;
  private draggingLayer = -1;
  private dragStartX = 0;
  private dragStartPosition = 0;

  private choicePanel?: Phaser.GameObjects.Container;
  private filmPanel?: Phaser.GameObjects.Container;
  private status?: Phaser.GameObjects.Text;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('SignalTuneScene');
  }

  create(data: SignalTuneData): void {
    this.tuneData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.stage = 'choose';
    this.selectedApproach = 0;
    this.selectedLayer = 0;
    this.positions = [...MICROFILM_STARTS];
    this.locked = [false, false, false];
    this.misses = 0;
    this.assisted = false;
    this.draggingLayer = -1;
    this.registry.set('nativeState', 'signaltune');

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x04060a, 0.78);
    if (this.textures.exists('bg1968A-mid')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg1968A-mid').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.11);
    }
    addPaperPanel(this, 150, 88, 660, 380, { radius: 9 });
    this.add.text(GAME_WIDTH / 2, 118, 'ARSIP MIKROFILM — 1968', {
      color: CSS.red, fontFamily: FONT.UI, fontSize: '23px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 143, 'Sejajarkan tanda registrasi pada tiga lapisan untuk memulihkan arsip.', {
      color: '#5A4A3C', fontFamily: FONT.META, fontSize: '13px',
    }).setOrigin(0.5);

    this.createApproachPanel();
    this.filmPanel = this.add.container(0, 0).setVisible(false);
    this.status = this.add.text(GAME_WIDTH / 2, 444, 'Pilih cara membaca arsip.', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '15px', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 500, '↑/↓ — LAPISAN   •   ←/→ — GESER   •   SPACE / ENTER — KUNCI', {
      color: '#6A5B4B', fontFamily: FONT.META, fontSize: '11px',
    }).setOrigin(0.5);

    this.keys = this.input.keyboard?.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.draggingLayer < 0 || !pointer.isDown) return;
      const position = Phaser.Math.Clamp(
        Math.round(this.dragStartPosition + (pointer.x - this.dragStartX) / 44),
        0,
        6,
      );
      if (position !== this.positions[this.draggingLayer]) {
        this.positions[this.draggingLayer] = position;
        this.renderFilms();
      }
    });
    this.input.on('pointerup', () => { this.draggingLayer = -1; });
  }

  update(): void {
    if (!this.keys || this.stage === 'success') return;
    const previous = Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a);
    const next = Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d);
    const up = Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w);
    const down = Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s);
    const confirm = Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter);

    if (this.stage === 'choose') {
      if (previous || up) this.selectApproach(0);
      else if (next || down) this.selectApproach(1);
      if (confirm) this.startPlay();
      return;
    }

    if (up) this.moveLayer(-1);
    else if (down) this.moveLayer(1);
    if (previous) this.shiftLayer(this.selectedLayer, -1);
    else if (next) this.shiftLayer(this.selectedLayer, 1);
    if (confirm) this.tryLock(this.selectedLayer);
  }

  snapshot(): Record<string, unknown> {
    return {
      minigame: 'microfilm_archive',
      stage: this.stage,
      selectedLayer: this.selectedLayer,
      positions: this.positions,
      targets: MICROFILM_TARGETS,
      locked: this.locked,
      misses: this.misses,
      assisted: this.assisted,
      hintDirection: this.assisted
        ? microfilmHint(this.positions[this.selectedLayer], MICROFILM_TARGETS[this.selectedLayer])
        : 0,
    };
  }

  /** Kartu pendekatan kertas legacy: wash merah + gores tinta bila terpilih. */
  private createApproachPanel(): void {
    this.choicePanel = this.add.container(0, 0);
    const prompt = this.add.text(GAME_WIDTH / 2, 168, 'PILIH PENDEKATAN MEMBACA ARSIP:', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '17px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.choicePanel.add(prompt);
    const definitions = [
      { x: 245, title: '1. EMPATI', desc: 'Cari jejak pribadi Arthur\ndi antara bingkai yang rusak.' },
      { x: 565, title: '2. LOGIKA', desc: 'Cocokkan nomor registrasi\ndan tanda optik.' },
    ];
    definitions.forEach((entry, index) => {
      const bg = this.add.rectangle(entry.x, 265, 290, 130, 0x5a4a3c, 0.06)
        .setStrokeStyle(1.5, 0x2b211a, 0.4)
        .setInteractive({ useHandCursor: true }).on('pointerup', () => {
          this.selectApproach(index);
          this.startPlay();
        });
      const title = this.add.text(entry.x, 232, entry.title, {
        color: CSS.body, fontFamily: FONT.UI, fontSize: '17px',
      }).setOrigin(0.5);
      const desc = this.add.text(entry.x, 280, entry.desc, {
        color: CSS.body, fontFamily: FONT.UI, fontSize: '15px', align: 'center',
      }).setOrigin(0.5);
      this.choicePanel?.add([bg, title, desc]);
    });
    this.add.text(GAME_WIDTH / 2, 398, '← → pilih  •  ENTER konfirmasi', {
      color: '#6A5B4B', fontFamily: FONT.UI, fontSize: '14px',
    }).setOrigin(0.5);
  }

  private selectApproach(index: number): void {
    if (this.selectedApproach === index) return;
    this.selectedApproach = index;
    this.soundManager?.playSelect();
    if (!this.choicePanel) return;
    [1, 4].forEach((childIndex, optionIndex) => {
      const bg = this.choicePanel?.getAt(childIndex) as Phaser.GameObjects.Rectangle;
      const title = this.choicePanel?.getAt(childIndex + 1) as Phaser.GameObjects.Text;
      const selected = optionIndex === this.selectedApproach;
      bg.setFillStyle(selected ? 0x94342e : 0x5a4a3c, selected ? 0.13 : 0.06);
      bg.setStrokeStyle(selected ? 3 : 1.5, 0x94342e, selected ? 1 : 0.4);
      title?.setFontStyle(selected ? 'bold' : 'normal');
    });
  }

  private startPlay(): void {
    if (this.stage !== 'choose') return;
    this.approach = this.selectedApproach === 0 ? 'empathy' : 'logic';
    this.stage = 'play';
    this.choicePanel?.setVisible(false);
    this.filmPanel?.setVisible(true);
    this.status?.setText('LAPISAN 1/3 — GESER TANDA KUNING KE GARIS TENGAH').setColor(CSS.body);
    this.soundManager?.playConfirm();
    this.renderFilms();
  }

  private moveLayer(direction: number): void {
    const open = this.locked.map((locked, index) => locked ? -1 : index).filter(index => index >= 0);
    const current = Math.max(0, open.indexOf(this.selectedLayer));
    this.selectedLayer = open[Phaser.Math.Wrap(current + direction, 0, open.length)];
    this.soundManager?.playSelect();
    this.renderFilms();
  }

  private shiftLayer(index: number, direction: number): void {
    if (this.locked[index]) return;
    this.selectedLayer = index;
    this.positions[index] = Phaser.Math.Clamp(this.positions[index] + direction, 0, 6);
    this.soundManager?.playGearTick(0.85 + index * 0.1);
    this.renderFilms();
  }

  private tryLock(index: number): void {
    if (this.stage !== 'play' || this.locked[index]) return;
    this.selectedLayer = index;
    if (this.positions[index] !== MICROFILM_TARGETS[index]) {
      this.misses += 1;
      this.assisted = this.misses >= 2;
      const direction = microfilmHint(this.positions[index], MICROFILM_TARGETS[index]);
      this.status?.setText(this.assisted
        ? `REGISTRASI BELUM PAS — GESER ${direction > 0 ? 'KE KANAN' : 'KE KIRI'}`
        : 'TANDA REGISTRASI BELUM BERIMPIT DENGAN GARIS TENGAH').setColor(CSS.redBright);
      this.soundManager?.playErrorBuzz();
      this.renderFilms();
      return;
    }

    this.locked[index] = true;
    this.soundManager?.playLockSuccess();
    if (this.locked.every(Boolean)) {
      this.finish();
      return;
    }
    this.selectedLayer = this.locked.findIndex(locked => !locked);
    this.status?.setText(`LAPISAN ${this.locked.filter(Boolean).length}/3 TERKUNCI — LANJUTKAN REGISTRASI`).setColor(CSS.green);
    this.renderFilms();
  }

  private renderFilms(): void {
    if (!this.filmPanel || this.stage !== 'play') return;
    this.filmPanel.removeAll(true);
    const colors = [0x5d91a9, 0xb98a3d, 0x94342e];

    for (let index = 0; index < 3; index += 1) {
      const y = 165 + index * 92;
      const selected = index === this.selectedLayer;
      const color = this.locked[index] ? 0x567a61 : colors[index];
      const film = this.add.rectangle(GAME_WIDTH / 2, y, 570, 70, 0x1a2630, 0.88)
        .setStrokeStyle(selected ? 3 : 1.6, color, selected ? 1 : 0.55)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (this.locked[index]) return;
          this.selectedLayer = index;
          this.draggingLayer = index;
          this.dragStartX = pointer.x;
          this.dragStartPosition = this.positions[index];
          this.renderFilms();
        });
      this.filmPanel.add(film);

      for (let hole = 0; hole < 10; hole += 1) {
        const hx = 230 + ((hole * 58 + this.positions[index] * 11) % 560);
        this.filmPanel.add(this.add.rectangle(hx, y - 26, 18, 6, 0x020617, 0.9));
        this.filmPanel.add(this.add.rectangle(hx, y + 26, 18, 6, 0x020617, 0.9));
      }

      const notchX = GAME_WIDTH / 2 + (this.positions[index] - MICROFILM_TARGETS[index]) * 44;
      this.filmPanel.add(this.add.rectangle(notchX, y, 7, 42, color, 0.95));
      this.filmPanel.add(this.add.rectangle(GAME_WIDTH / 2, y, 3, 62, 0xffffff, 0.8));
      this.filmPanel.add(this.add.text(180, y, `${index + 1}`, {
        color: CSS.body, fontFamily: FONT.TITLE, fontSize: '18px', fontStyle: 'bold',
      }).setOrigin(0.5));
      if (this.assisted && selected && !this.locked[index]) {
        const direction = microfilmHint(this.positions[index], MICROFILM_TARGETS[index]);
        this.filmPanel.add(this.add.text(775, y, direction > 0 ? '→' : direction < 0 ? '←' : '✓', {
          color: '#b98a3d', fontFamily: FONT.UI, fontSize: '26px', fontStyle: 'bold',
        }).setOrigin(0.5));
      }
      this.addFilmButton(128, y, '‹', () => this.shiftLayer(index, -1));
      this.addFilmButton(800, y, '›', () => this.shiftLayer(index, 1));
      this.addFilmButton(870, y, this.locked[index] ? '✓' : 'KUNCI', () => this.tryLock(index), 74);
    }
  }

  private addFilmButton(x: number, y: number, label: string, action: () => void, width = 42): void {
    if (!this.filmPanel) return;
    const bg = this.add.rectangle(x, y, width, 36, 0x94342e, 0.95)
      .setStrokeStyle(1.5, 0x6d211d, 1).setInteractive({ useHandCursor: true }).on('pointerup', action);
    const text = this.add.text(x, y, label, {
      color: '#FFF8EA', fontFamily: FONT.UI, fontSize: label.length > 2 ? '10px' : '18px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.filmPanel.add([bg, text]);
  }

  private finish(): void {
    this.stage = 'success';
    this.tuneData.run.challenges['1968'] = this.approach;
    this.tuneData.run[this.approach] += 1;
    this.tuneData.save.saveCycle('1968', this.tuneData.run);
    this.filmPanel?.removeAll(true);

    // kartu sukses kertas legacy
    this.add.rectangle(GAME_WIDTH / 2, 275, 660, 180, 0xf3eada, 0.96);
    this.add.text(GAME_WIDTH / 2, 235, 'ARSIP TERPULIHKAN', {
      color: CSS.green, fontFamily: FONT.UI, fontSize: '27px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 285, 'Tiga lapisan mikrofilm kembali selaras.', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '16px',
    }).setOrigin(0.5);
    this.status?.setVisible(false);
    this.soundManager?.playSuccessFanfare();
    this.time.delayedCall(1000, () => {
      this.scene.stop();
      this.tuneData.onComplete();
    });
  }
}
