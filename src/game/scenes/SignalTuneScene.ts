import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { MICROFILM_STARTS, MICROFILM_TARGETS, microfilmHint } from '../minigames/challengeRules';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

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

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x030b15, 0.97);
    if (this.textures.exists('bg1968A-mid')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg1968A-mid').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.11);
    }
    this.add.text(GAME_WIDTH / 2, 32, 'ARSIP MIKROFILM — 1968', {
      color: '#67e8f9', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
      stroke: '#06131c', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 67, 'Sejajarkan tanda registrasi pada tiga lapisan untuk memulihkan arsip.', {
      color: '#e0f2fe', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    this.createApproachPanel();
    this.filmPanel = this.add.container(0, 0).setVisible(false);
    this.status = this.add.text(GAME_WIDTH / 2, 438, 'Pilih cara membaca arsip.', {
      backgroundColor: '#071521e8', color: '#bae6fd', fontFamily: 'Poppins, sans-serif',
      fontSize: '13px', padding: { x: 18, y: 9 }, align: 'center',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 500, '↑/↓ — LAPISAN   •   ←/→ — GESER   •   SPACE / ENTER — KUNCI', {
      color: '#94a3b8', fontFamily: 'Poppins, sans-serif', fontSize: '11px',
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

  private createApproachPanel(): void {
    this.choicePanel = this.add.container(0, 0);
    const prompt = this.add.text(GAME_WIDTH / 2, 112, 'PILIH PENDEKATAN MEMBACA ARSIP:', {
      color: '#f8fafc', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);
    this.choicePanel.add(prompt);
    const definitions = [
      { x: 310, title: 'EMPATI', desc: 'Cari jejak pribadi Arthur\ndi antara bingkai yang rusak.', color: 0x2b6b70 },
      { x: 650, title: 'LOGIKA', desc: 'Cocokkan nomor registrasi\ndan tanda optik.', color: 0x28364f },
    ];
    definitions.forEach((entry, index) => {
      const bg = this.add.rectangle(entry.x, 235, 300, 116, entry.color, 0.95)
        .setStrokeStyle(index ? 2 : 3, index ? 0x67e8f9 : 0xf7d984, index ? 0.45 : 1)
        .setInteractive({ useHandCursor: true }).on('pointerup', () => {
          this.selectApproach(index);
          this.startPlay();
        });
      const title = this.add.text(entry.x, 205, entry.title, {
        color: '#f8fafc', fontFamily: 'Cinzel, serif', fontSize: '16px', fontStyle: 'bold',
      }).setOrigin(0.5);
      const desc = this.add.text(entry.x, 252, entry.desc, {
        color: '#dbeafe', fontFamily: 'Patrick Hand, sans-serif', fontSize: '16px', align: 'center',
      }).setOrigin(0.5);
      this.choicePanel?.add([bg, title, desc]);
    });
  }

  private selectApproach(index: number): void {
    if (this.selectedApproach === index) return;
    this.selectedApproach = index;
    this.soundManager?.playSelect();
    if (!this.choicePanel) return;
    [1, 4].forEach((childIndex, optionIndex) => {
      const bg = this.choicePanel?.getAt(childIndex) as Phaser.GameObjects.Rectangle;
      const selected = optionIndex === this.selectedApproach;
      bg.setStrokeStyle(selected ? 3 : 2, selected ? 0xf7d984 : 0x67e8f9, selected ? 1 : 0.45);
    });
  }

  private startPlay(): void {
    if (this.stage !== 'choose') return;
    this.approach = this.selectedApproach === 0 ? 'empathy' : 'logic';
    this.stage = 'play';
    this.choicePanel?.setVisible(false);
    this.filmPanel?.setVisible(true);
    this.status?.setText('LAPISAN 1/3 — GESER TANDA KUNING KE GARIS TENGAH').setColor('#bae6fd');
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
        : 'TANDA REGISTRASI BELUM BERIMPIT DENGAN GARIS TENGAH').setColor('#fca5a5');
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
    this.status?.setText(`LAPISAN ${this.locked.filter(Boolean).length}/3 TERKUNCI — LANJUTKAN REGISTRASI`).setColor('#86efac');
    this.renderFilms();
  }

  private renderFilms(): void {
    if (!this.filmPanel || this.stage !== 'play') return;
    this.filmPanel.removeAll(true);
    const colors = [0x67e8f9, 0xf7d984, 0xf472b6];

    for (let index = 0; index < 3; index += 1) {
      const y = 165 + index * 92;
      const selected = index === this.selectedLayer;
      const color = this.locked[index] ? 0x86efac : colors[index];
      const film = this.add.rectangle(GAME_WIDTH / 2, y, 570, 70, 0x102b3a, 0.82)
        .setStrokeStyle(selected ? 3 : 2, color, selected ? 1 : 0.55)
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
        color: '#e0f2fe', fontFamily: 'Cinzel, serif', fontSize: '18px', fontStyle: 'bold',
      }).setOrigin(0.5));
      if (this.assisted && selected && !this.locked[index]) {
        const direction = microfilmHint(this.positions[index], MICROFILM_TARGETS[index]);
        this.filmPanel.add(this.add.text(775, y, direction > 0 ? '→' : direction < 0 ? '←' : '✓', {
          color: '#facc15', fontFamily: 'Poppins, sans-serif', fontSize: '28px', fontStyle: 'bold',
        }).setOrigin(0.5));
      }
      this.addFilmButton(128, y, '‹', () => this.shiftLayer(index, -1));
      this.addFilmButton(800, y, '›', () => this.shiftLayer(index, 1));
      this.addFilmButton(870, y, this.locked[index] ? '✓' : 'KUNCI', () => this.tryLock(index), 74);
    }
  }

  private addFilmButton(x: number, y: number, label: string, action: () => void, width = 42): void {
    if (!this.filmPanel) return;
    const bg = this.add.rectangle(x, y, width, 36, 0x0c4a6e, 0.95)
      .setStrokeStyle(2, 0x67e8f9, 0.7).setInteractive({ useHandCursor: true }).on('pointerup', action);
    const text = this.add.text(x, y, label, {
      color: '#f8fafc', fontFamily: 'Poppins, sans-serif', fontSize: label.length > 2 ? '10px' : '18px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.filmPanel.add([bg, text]);
  }

  private finish(): void {
    this.stage = 'success';
    this.tuneData.run.challenges['1968'] = this.approach;
    this.tuneData.run[this.approach] += 1;
    this.tuneData.save.saveCycle('1968', this.tuneData.run);
    this.filmPanel?.removeAll(true);
    this.status?.setText('TIGA LAPISAN SELARAS — ARSIP ARTHUR PROJECT DIPULIHKAN').setColor('#86efac');
    this.add.text(GAME_WIDTH / 2, 255, 'ARSIP TERPULIHKAN', {
      color: '#a5f3fc', fontFamily: 'Cinzel, serif', fontSize: '30px', fontStyle: 'bold',
      stroke: '#083344', strokeThickness: 6,
    }).setOrigin(0.5);
    this.soundManager?.playSuccessFanfare();
    this.time.delayedCall(900, () => {
      this.scene.stop();
      this.tuneData.onComplete();
    });
  }
}
