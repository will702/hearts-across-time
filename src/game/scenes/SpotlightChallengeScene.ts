import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  EVACUATION_BOARDS,
  applyEvacuationStep,
  nextEvacuationStep,
  samePoint,
  type GridPoint,
} from '../minigames/challengeRules';
import type { RunState, SaveSystem } from '../systems/SaveSystem';
import { addPaperPanel } from '../ui/paper';
import { CSS, FONT } from '../ui/theme';

export type SpotlightChallengeData = {
  run: RunState;
  save: SaveSystem;
  onComplete: () => void;
};

const CELL_SIZE = 62;
const MAP_TOP = 126;
const PANEL = { x: 150, y: 56, w: 660, h: 424 };

export class SpotlightChallengeScene extends Phaser.Scene {
  private challengeData!: SpotlightChallengeData;
  private soundManager?: SoundManager;
  private stage: 'choose' | 'play' | 'success' = 'choose';
  private chosenApproach: 'empathy' | 'logic' = 'empathy';
  private selectedChoice = 0;
  private round = 0;
  private path: GridPoint[] = [];
  private cursor: GridPoint = { x: 0, y: 0 };
  private misses = 0;
  private assisted = false;

  private chooseContainer?: Phaser.GameObjects.Container;
  private boardContainer?: Phaser.GameObjects.Container;
  private statusText?: Phaser.GameObjects.Text;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('SpotlightChallengeScene');
  }

  create(data: SpotlightChallengeData): void {
    this.challengeData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'spotlight_challenge');
    this.stage = 'choose';
    this.selectedChoice = 0;
    this.round = 0;
    this.path = [];
    this.misses = 0;
    this.assisted = false;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x04060a, 0.76);
    if (this.textures.exists('bg1944-mid')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg1944-mid').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.16);
    }
    addPaperPanel(this, PANEL.x, PANEL.y, PANEL.w, PANEL.h, { radius: 9 });
    this.add.text(GAME_WIDTH / 2, 82, 'PETA EVAKUASI GARIS DEPAN — 1944', {
      color: CSS.red, fontFamily: FONT.UI, fontSize: '21px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 105, 'Bawa tiga korban menuju pos medis tanpa memasuki sektor berbahaya.', {
      color: '#5A4A3C', fontFamily: FONT.META, fontSize: '12px',
    }).setOrigin(0.5);

    this.boardContainer = this.add.container(0, 0).setVisible(false);
    this.statusText = this.add.text(GAME_WIDTH / 2, 420, 'Pilih cara membaca medan evakuasi.', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '15px', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 452, 'PANAH / WASD — FOKUS   •   SPACE / ENTER — PILIH   •   BACKSPACE — MUNDUR', {
      color: '#6A5B4B', fontFamily: FONT.META, fontSize: '11px',
    }).setOrigin(0.5);

    this.createChooseUI();
    this.keys = this.input.keyboard?.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      back: Phaser.Input.Keyboard.KeyCodes.BACKSPACE,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  update(): void {
    if (!this.keys || this.stage === 'success') return;
    const left = Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a);
    const right = Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d);
    const up = Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w);
    const down = Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s);
    const confirm = Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.space);

    if (this.stage === 'choose') {
      if (left || up) this.selectApproach(0);
      else if (right || down) this.selectApproach(1);
      if (confirm) this.startPlayStage();
      return;
    }

    if (left) this.moveCursor(-1, 0);
    else if (right) this.moveCursor(1, 0);
    else if (up) this.moveCursor(0, -1);
    else if (down) this.moveCursor(0, 1);
    if (confirm) this.commit(this.cursor);
    if (Phaser.Input.Keyboard.JustDown(this.keys.back) && this.path.length > 1) {
      this.path.pop();
      this.cursor = { ...this.path[this.path.length - 1] };
      this.soundManager?.playSelect();
      this.renderBoard();
    }
  }

  snapshot(): Record<string, unknown> {
    const board = EVACUATION_BOARDS[this.round];
    return {
      minigame: 'evacuation_map',
      stage: this.stage,
      round: this.round,
      board: board ? { width: board.width, height: board.height, start: board.start, goal: board.goal, blocked: board.blocked } : null,
      path: this.path,
      cursor: this.cursor,
      misses: this.misses,
      assisted: this.assisted,
      hintCell: this.assisted && board ? nextEvacuationStep(board, this.path) : null,
    };
  }

  /** Kartu pendekatan kertas legacy: wash merah + gores tinta bila terpilih. */
  private createChooseUI(): void {
    this.chooseContainer = this.add.container(0, 0);
    const subtitle = this.add.text(GAME_WIDTH / 2, 168, 'PILIH PENDEKATAN EVAKUASI:', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '17px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const entries = [
      { x: 245, title: '1. EMPATI', desc: 'Dahulukan korban paling rentan.\n(Fokus pada keselamatan manusia)' },
      { x: 565, title: '2. LOGIKA', desc: 'Cari jalur tercepat yang masih aman.\n(Fokus pada efisiensi rute)' },
    ];
    entries.forEach((entry, index) => {
      const bg = this.add.rectangle(entry.x, 265, 290, 130, 0x5a4a3c, 0.06)
        .setStrokeStyle(1.5, 0x2b211a, 0.4).setInteractive({ useHandCursor: true })
        .on('pointerup', () => { this.selectApproach(index); this.startPlayStage(); });
      const title = this.add.text(entry.x, 232, entry.title, {
        color: CSS.body, fontFamily: FONT.UI, fontSize: '17px',
      }).setOrigin(0.5);
      const desc = this.add.text(entry.x, 280, entry.desc, {
        color: CSS.body, fontFamily: FONT.UI, fontSize: '15px', align: 'center',
      }).setOrigin(0.5);
      this.chooseContainer?.add([bg, title, desc]);
    });
    this.chooseContainer.add(subtitle);
    this.add.text(GAME_WIDTH / 2, 398, '← → pilih  •  ENTER konfirmasi', {
      color: '#6A5B4B', fontFamily: FONT.UI, fontSize: '14px',
    }).setOrigin(0.5);
  }

  private selectApproach(index: number): void {
    if (this.selectedChoice === index) return;
    this.selectedChoice = index;
    this.soundManager?.playSelect();
    this.refreshChoiceUI();
  }

  private refreshChoiceUI(): void {
    if (!this.chooseContainer) return;
    [0, 3].forEach((childIndex, index) => {
      const selected = index === this.selectedChoice;
      const bg = this.chooseContainer?.getAt(childIndex) as Phaser.GameObjects.Rectangle;
      const title = this.chooseContainer?.getAt(childIndex + 1) as Phaser.GameObjects.Text;
      bg.setFillStyle(selected ? 0x94342e : 0x5a4a3c, selected ? 0.13 : 0.06);
      bg.setStrokeStyle(selected ? 3 : 1.5, 0x94342e, selected ? 1 : 0.4);
      title.setFontStyle(selected ? 'bold' : 'normal');
    });
  }

  private startPlayStage(): void {
    if (this.stage !== 'choose') return;
    this.chosenApproach = this.selectedChoice === 0 ? 'empathy' : 'logic';
    this.stage = 'play';
    this.chooseContainer?.setVisible(false);
    this.boardContainer?.setVisible(true);
    this.soundManager?.playConfirm();
    this.startRound();
  }

  private startRound(): void {
    const board = EVACUATION_BOARDS[this.round];
    this.path = [{ ...board.start }];
    this.cursor = { ...board.start };
    this.statusText?.setText(`EVAKUASI ${this.round + 1}/3 — PILIH PETAK BERSEBELAHAN MENUJU POS MEDIS`).setColor(CSS.body);
    this.renderBoard();
  }

  private moveCursor(dx: number, dy: number): void {
    const board = EVACUATION_BOARDS[this.round];
    this.cursor = {
      x: Phaser.Math.Clamp(this.cursor.x + dx, 0, board.width - 1),
      y: Phaser.Math.Clamp(this.cursor.y + dy, 0, board.height - 1),
    };
    this.soundManager?.playSelect();
    this.renderBoard();
  }

  private commit(point: GridPoint): void {
    if (this.stage !== 'play') return;
    const board = EVACUATION_BOARDS[this.round];
    const result = applyEvacuationStep(board, this.path, point);
    this.path = result.path;
    if (result.result === 'invalid') {
      this.misses += 1;
      this.assisted = this.misses >= 2;
      this.soundManager?.playErrorBuzz();
      this.statusText?.setText(this.assisted
        ? 'JALUR TIDAK AMAN — PETAK SARAN DISOROT EMAS'
        : 'PILIH PETAK TERBUKA YANG BERSEBELAHAN').setColor(CSS.redBright);
    } else {
      this.cursor = { ...this.path[this.path.length - 1] };
      this.soundManager?.playLockSuccess();
      if (samePoint(this.cursor, board.goal)) {
        if (this.round === EVACUATION_BOARDS.length - 1) {
          this.finish();
          return;
        }
        this.statusText?.setText('KORBAN TIBA DI POS MEDIS — BUKA PETA BERIKUTNYA').setColor(CSS.green);
        this.time.delayedCall(420, () => {
          this.round += 1;
          this.startRound();
        });
        return;
      }
    }
    this.renderBoard();
  }

  private renderBoard(): void {
    if (!this.boardContainer || this.stage !== 'play') return;
    this.boardContainer.removeAll(true);
    const board = EVACUATION_BOARDS[this.round];
    const originX = (GAME_WIDTH - board.width * CELL_SIZE) / 2;
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0x567a61, 0.85);
    for (let index = 1; index < this.path.length; index += 1) {
      const from = this.path[index - 1];
      const to = this.path[index];
      graphics.lineBetween(
        originX + from.x * CELL_SIZE + CELL_SIZE / 2,
        MAP_TOP + from.y * CELL_SIZE + CELL_SIZE / 2,
        originX + to.x * CELL_SIZE + CELL_SIZE / 2,
        MAP_TOP + to.y * CELL_SIZE + CELL_SIZE / 2,
      );
    }
    this.boardContainer.add(graphics);
    const hint = this.assisted ? nextEvacuationStep(board, this.path) : null;

    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const point = { x, y };
        const cx = originX + x * CELL_SIZE + CELL_SIZE / 2;
        const cy = MAP_TOP + y * CELL_SIZE + CELL_SIZE / 2;
        const blocked = board.blocked.some(cell => samePoint(cell, point));
        const used = this.path.some(cell => samePoint(cell, point));
        const isGoal = samePoint(board.goal, point);
        const isStart = samePoint(board.start, point);
        const isHint = Boolean(hint && samePoint(hint, point));
        const cell = this.add.rectangle(cx, cy, CELL_SIZE - 7, CELL_SIZE - 7,
          blocked ? 0x94342e : used ? 0x567a61 : 0xf3eada, blocked ? 0.16 : used ? 0.3 : 1)
          .setStrokeStyle(isHint ? 4 : samePoint(this.cursor, point) ? 3 : 1.4,
            isHint ? 0xb98a3d : samePoint(this.cursor, point) ? 0x94342e : 0x2b211a,
            isHint ? 1 : samePoint(this.cursor, point) ? 1 : 0.35)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => { this.cursor = point; this.commit(point); });
        const label = this.add.text(cx, cy, blocked ? '✕' : isGoal ? '✚' : isStart ? '●' : used ? '•' : '', {
          color: blocked ? CSS.redBright : isGoal ? CSS.red : isStart ? '#55677A' : CSS.green,
          fontFamily: FONT.UI, fontSize: isGoal ? '26px' : '19px', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.boardContainer.add([cell, label]);
      }
    }
  }

  private finish(): void {
    this.stage = 'success';
    this.challengeData.run.challenges['1944'] = this.chosenApproach;
    this.challengeData.run[this.chosenApproach] += 1;
    this.challengeData.save.saveCycle('1944', this.challengeData.run, 765);
    this.boardContainer?.removeAll(true);

    // kartu sukses kertas legacy
    this.add.rectangle(GAME_WIDTH / 2, 275, 660, 180, 0xf3eada, 0.96);
    this.add.text(GAME_WIDTH / 2, 235, 'JALUR EVAKUASI AMAN', {
      color: CSS.green, fontFamily: FONT.UI, fontSize: '27px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 285, 'Semua korban tiba di pos medis.', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '16px',
    }).setOrigin(0.5);
    this.statusText?.setText('').setVisible(false);
    this.soundManager?.playSuccessFanfare();
    this.time.delayedCall(1000, () => {
      this.scene.stop();
      this.challengeData.onComplete();
    });
  }
}
