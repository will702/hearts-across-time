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

export type SpotlightChallengeData = {
  run: RunState;
  save: SaveSystem;
  onComplete: () => void;
};

const CELL_SIZE = 62;
const MAP_TOP = 126;

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

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x100c08, 0.96);
    if (this.textures.exists('bg1944-mid')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg1944-mid').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.16);
    }
    this.add.text(GAME_WIDTH / 2, 34, 'PETA EVAKUASI GARIS DEPAN — 1944', {
      color: '#f7d984', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
      stroke: '#1a0f08', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 70, 'Bawa tiga korban menuju pos medis tanpa memasuki sektor berbahaya.', {
      color: '#fff8ea', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    this.boardContainer = this.add.container(0, 0).setVisible(false);
    this.statusText = this.add.text(GAME_WIDTH / 2, 430, 'Pilih cara membaca medan evakuasi.', {
      backgroundColor: '#180f0ce8', color: '#f6d57b', fontFamily: 'Poppins, sans-serif',
      fontSize: '13px', padding: { x: 18, y: 9 }, align: 'center',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 490, 'PANAH / WASD — FOKUS   •   SPACE / ENTER — PILIH   •   BACKSPACE — MUNDUR', {
      color: '#d6c5ae', fontFamily: 'Poppins, sans-serif', fontSize: '11px',
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

  private createChooseUI(): void {
    this.chooseContainer = this.add.container(0, 0);
    const subtitle = this.add.text(GAME_WIDTH / 2, 112, 'PILIH PENDEKATAN EVAKUASI:', {
      color: '#fffbf0', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);
    const entries = [
      { x: 310, title: '1. EMPATI', desc: 'Dahulukan korban paling rentan.\n(Fokus pada keselamatan manusia)' },
      { x: 650, title: '2. LOGIKA', desc: 'Cari jalur tercepat yang masih aman.\n(Fokus pada efisiensi rute)' },
    ];
    entries.forEach((entry, index) => {
      const bg = this.add.rectangle(entry.x, 230, 310, 116, index ? 0x181410 : 0xd3a848, 0.96)
        .setStrokeStyle(2, 0x6a4930).setInteractive({ useHandCursor: true })
        .on('pointerup', () => { this.selectApproach(index); this.startPlayStage(); });
      const title = this.add.text(entry.x, 197, entry.title, {
        color: index ? '#f5f0e8' : '#100c08', fontFamily: 'Cinzel, serif', fontSize: '15px', fontStyle: 'bold',
      }).setOrigin(0.5);
      const desc = this.add.text(entry.x, 244, entry.desc, {
        color: index ? '#f5f0e8' : '#100c08', fontFamily: 'Patrick Hand, sans-serif', fontSize: '14px', align: 'center',
      }).setOrigin(0.5);
      this.chooseContainer?.add([bg, title, desc]);
    });
    this.chooseContainer.add(subtitle);
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
      const desc = this.chooseContainer?.getAt(childIndex + 2) as Phaser.GameObjects.Text;
      bg.setFillStyle(selected ? 0xd3a848 : 0x181410, 0.96);
      title.setColor(selected ? '#100c08' : '#f5f0e8');
      desc.setColor(selected ? '#100c08' : '#f5f0e8');
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
    this.statusText?.setText(`EVAKUASI ${this.round + 1}/3 — PILIH PETAK BERSEBELAHAN MENUJU POS MEDIS`).setColor('#f6d57b');
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
        : 'PILIH PETAK TERBUKA YANG BERSEBELAHAN').setColor('#fca5a5');
    } else {
      this.cursor = { ...this.path[this.path.length - 1] };
      this.soundManager?.playLockSuccess();
      if (samePoint(this.cursor, board.goal)) {
        if (this.round === EVACUATION_BOARDS.length - 1) {
          this.finish();
          return;
        }
        this.statusText?.setText('KORBAN TIBA DI POS MEDIS — BUKA PETA BERIKUTNYA').setColor('#86efac');
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
    graphics.lineStyle(8, 0x86efac, 0.75);
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
          blocked ? 0x4c1d1d : used ? 0x14532d : 0x3b3025, 0.95)
          .setStrokeStyle(isHint ? 4 : samePoint(this.cursor, point) ? 3 : 1,
            isHint ? 0xfacc15 : samePoint(this.cursor, point) ? 0xf7d984 : 0x8a7058,
            1)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => { this.cursor = point; this.commit(point); });
        const label = this.add.text(cx, cy, blocked ? '✕' : isGoal ? '✚' : isStart ? '●' : used ? '•' : '', {
          color: blocked ? '#fca5a5' : isGoal ? '#67e8f9' : isStart ? '#f7d984' : '#bbf7d0',
          fontFamily: 'Poppins, sans-serif', fontSize: isGoal ? '28px' : '20px', fontStyle: 'bold',
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
    this.statusText?.setText('TIGA JALUR EVAKUASI AMAN — SEMUA KORBAN TIBA DI POS MEDIS').setColor('#86efac');
    this.soundManager?.playSuccessFanfare();
    this.time.delayedCall(850, () => {
      this.scene.stop();
      this.challengeData.onComplete();
    });
  }
}
