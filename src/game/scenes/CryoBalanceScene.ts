import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  circuitBoardsForLoop,
  circuitDifficultyForLoop,
  circuitMask,
  firstCircuitHint,
  isCircuitComplete,
  type CircuitBoard,
} from '../minigames/challengeRules';
import type { RunState, SaveSystem } from '../systems/SaveSystem';
import { addPaperPanel } from '../ui/paper';
import { CSS, FONT } from '../ui/theme';

export type CryoBalanceData = {
  run: RunState;
  save: SaveSystem;
  onComplete: () => void;
};

const CELL_SIZE = 82;
const GRID_TOP = 136;

export class CryoBalanceScene extends Phaser.Scene {
  private balanceData!: CryoBalanceData;
  private soundManager?: SoundManager;
  private stage: 'choose' | 'play' | 'success' = 'choose';
  private chosenApproach: 'empathy' | 'logic' = 'empathy';
  private selectedChoice = 0;
  private system = 0;
  private rotations: number[] = [];
  private focusIndex = 0;
  private testFailures = 0;
  private assisted = false;
  private boards: readonly CircuitBoard[] = [];

  private statusText?: Phaser.GameObjects.Text;
  private chooseContainer?: Phaser.GameObjects.Container;
  private boardContainer?: Phaser.GameObjects.Container;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('CryoBalanceScene');
  }

  create(data: CryoBalanceData): void {
    this.balanceData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'cryobalance');
    this.stage = 'choose';
    this.selectedChoice = 0;
    this.system = 0;
    this.rotations = [];
    this.focusIndex = 0;
    this.testFailures = 0;
    this.assisted = false;
    this.boards = circuitBoardsForLoop(data.run.loop);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x04060a, 0.8);
    if (this.textures.exists('bg1999-mid')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg1999-mid').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.1);
    }
    addPaperPanel(this, 150, 60, 660, 374, { radius: 9 });
    this.add.text(GAME_WIDTH / 2, 88, 'SIRKUIT PENDINGIN KAPSUL — 1999', {
      color: CSS.red, fontFamily: FONT.UI, fontSize: '23px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 113, 'Sambungkan daya, pendingin, dan serum tanpa jalur bocor.', {
      color: '#5A4A3C', fontFamily: FONT.META, fontSize: '13px',
    }).setOrigin(0.5);

    this.boardContainer = this.add.container(0, 0).setVisible(false);
    this.statusText = this.add.text(GAME_WIDTH / 2, 448, 'Pilih prioritas pemulihan kapsul.', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '15px', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 500, 'PANAH / WASD — FOKUS   •   SPACE — PUTAR   •   ENTER — UJI ALIRAN', {
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
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  update(): void {
    if (!this.keys || this.stage === 'success') return;
    const left = Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a);
    const right = Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d);
    const up = Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w);
    const down = Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s);

    if (this.stage === 'choose') {
      if (left || up) this.selectApproach(0);
      else if (right || down) this.selectApproach(1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.space)) this.startPlay();
      return;
    }

    if (left) this.moveFocus(-1, 0);
    else if (right) this.moveFocus(1, 0);
    else if (up) this.moveFocus(0, -1);
    else if (down) this.moveFocus(0, 1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) this.rotateTile(this.focusIndex);
    if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.testFlow();
  }

  snapshot(): Record<string, unknown> {
    const board = this.boards[this.system];
    return {
      minigame: 'coolant_circuit',
      stage: this.stage,
      system: this.system,
      systemLabel: board?.label ?? null,
      rotations: this.rotations,
      targetRotations: board?.tiles.map(() => 0) ?? [],
      tiles: board?.tiles.map((tile, index) => ({
        index,
        x: index % board.width,
        y: Math.floor(index / board.width),
        active: tile.targetMask !== 0,
        pipe: tile.pipeMask !== 0,
        decoy: tile.targetMask === 0,
        rotation: this.rotations[index] ?? 0,
        targetRotation: 0,
      })) ?? [],
      focusIndex: this.focusIndex,
      testFailures: this.testFailures,
      assisted: this.assisted,
      loop: this.balanceData.run.loop,
      difficulty: circuitDifficultyForLoop(this.balanceData.run.loop),
      activeTileCount: board?.tiles.filter(tile => tile.targetMask !== 0).length ?? 0,
      pipeTileCount: board?.tiles.filter(tile => tile.pipeMask !== 0).length ?? 0,
      hintTile: this.assisted && board ? firstCircuitHint(board, this.rotations) : null,
    };
  }

  /** Kartu pendekatan kertas legacy: wash merah + gores tinta bila terpilih. */
  private createChooseUI(): void {
    this.chooseContainer = this.add.container(0, 0);
    const subtitle = this.add.text(GAME_WIDTH / 2, 152, 'PILIH PRIORITAS PEMULIHAN KAPSUL:', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '17px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const entries = [
      { x: 320, title: '1. EMPATI', desc: 'Pulihkan jalur penunjang hidup dahulu.\n(Menjaga Arthur tetap aman)' },
      { x: 640, title: '2. LOGIKA', desc: 'Pulihkan sistem sesuai dependensi.\n(Menjaga formula tetap murni)' },
    ];
    entries.forEach((entry, index) => {
      const bg = this.add.rectangle(entry.x, 250, 290, 130, 0x5a4a3c, 0.06)
        .setStrokeStyle(1.5, 0x2b211a, 0.4)
        .setInteractive({ useHandCursor: true }).on('pointerup', () => {
          this.selectApproach(index);
          this.startPlay();
        });
      const title = this.add.text(entry.x, 217, entry.title, {
        color: CSS.body, fontFamily: FONT.UI, fontSize: '17px',
      }).setOrigin(0.5);
      const desc = this.add.text(entry.x, 265, entry.desc, {
        color: CSS.body, fontFamily: FONT.UI, fontSize: '15px', align: 'center',
      }).setOrigin(0.5);
      this.chooseContainer?.add([bg, title, desc]);
    });
    this.chooseContainer.add(subtitle);
    this.add.text(GAME_WIDTH / 2, 384, '← → pilih  •  ENTER konfirmasi', {
      color: '#6A5B4B', fontFamily: FONT.UI, fontSize: '14px',
    }).setOrigin(0.5);
  }

  private selectApproach(index: number): void {
    if (this.selectedChoice === index) return;
    this.selectedChoice = index;
    this.soundManager?.playSelect();
    if (!this.chooseContainer) return;
    [0, 3].forEach((childIndex, optionIndex) => {
      const selected = optionIndex === this.selectedChoice;
      const bg = this.chooseContainer?.getAt(childIndex) as Phaser.GameObjects.Rectangle;
      const title = this.chooseContainer?.getAt(childIndex + 1) as Phaser.GameObjects.Text;
      bg.setFillStyle(selected ? 0x94342e : 0x5a4a3c, selected ? 0.13 : 0.06);
      bg.setStrokeStyle(selected ? 3 : 1.5, 0x94342e, selected ? 1 : 0.4);
      title?.setFontStyle(selected ? 'bold' : 'normal');
    });
  }

  private startPlay(): void {
    if (this.stage !== 'choose') return;
    this.chosenApproach = this.selectedChoice === 0 ? 'empathy' : 'logic';
    this.stage = 'play';
    this.chooseContainer?.setVisible(false);
    this.boardContainer?.setVisible(true);
    this.soundManager?.playConfirm();
    this.startSystem();
  }

  private startSystem(): void {
    const board = this.boards[this.system];
    this.rotations = board.tiles.map(tile => tile.initialRotation);
    this.focusIndex = board.sourceIndex;
    const difficulty = circuitDifficultyForLoop(this.balanceData.run.loop);
    this.statusText?.setText(`SISTEM ${this.system + 1}/3 — ${board.label} • ${difficulty}: PIPA PENGECOH BOLEH DIABAIKAN`).setColor(CSS.body);
    this.renderCircuit();
  }

  private moveFocus(dx: number, dy: number): void {
    const board = this.boards[this.system];
    let x = this.focusIndex % board.width;
    let y = Math.floor(this.focusIndex / board.width);
    x = Phaser.Math.Wrap(x + dx, 0, board.width);
    y = Phaser.Math.Wrap(y + dy, 0, board.height);
    this.focusIndex = y * board.width + x;
    this.soundManager?.playSelect();
    this.renderCircuit();
  }

  private rotateTile(index: number): void {
    const board = this.boards[this.system];
    if (this.stage !== 'play' || !board.tiles[index]?.pipeMask) return;
    this.focusIndex = index;
    this.rotations[index] = (this.rotations[index] + 1) % 4;
    this.soundManager?.playGearTick(0.9 + this.system * 0.1);
    this.renderCircuit();
  }

  private testFlow(): void {
    if (this.stage !== 'play') return;
    const board = this.boards[this.system];
    if (!isCircuitComplete(board, this.rotations)) {
      this.testFailures += 1;
      this.assisted = this.testFailures >= 2;
      this.soundManager?.playErrorBuzz();
      this.statusText?.setText(this.assisted
        ? 'ALIRAN BOCOR — KONDUIT YANG PERLU DIPERBAIKI DISOROT EMAS'
        : 'ALIRAN TERPUTUS ATAU BOCOR — PERIKSA SAMBUNGAN').setColor(CSS.redBright);
      if (!this.registry.get('reduceMotion')) this.cameras.main.shake(130, 0.004);
      this.renderCircuit();
      return;
    }

    this.soundManager?.playSteamRelease();
    if (this.system === this.boards.length - 1) {
      this.finish();
      return;
    }
    this.statusText?.setText('ALIRAN STABIL — MENGALIHKAN KE SISTEM BERIKUTNYA').setColor(CSS.green);
    this.time.delayedCall(420, () => {
      this.system += 1;
      this.startSystem();
    });
  }

  private renderCircuit(): void {
    if (!this.boardContainer || this.stage !== 'play') return;
    this.boardContainer.removeAll(true);
    const board = this.boards[this.system];
    const originX = (GAME_WIDTH - board.width * CELL_SIZE) / 2;
    const colors = [0xb98a3d, 0x5d91a9, 0x94342e];
    const color = colors[this.system];
    const hint = this.assisted ? firstCircuitHint(board, this.rotations) : null;

    board.tiles.forEach((tile, index) => {
      const x = index % board.width;
      const y = Math.floor(index / board.width);
      const cx = originX + x * CELL_SIZE + CELL_SIZE / 2;
      const cy = GRID_TOP + y * CELL_SIZE + CELL_SIZE / 2;
      const selected = index === this.focusIndex;
      const cell = this.add.rectangle(cx, cy, CELL_SIZE - 7, CELL_SIZE - 7, 0x14202a, 0.96)
        .setStrokeStyle(index === hint ? 4 : selected ? 3 : 1.2,
          index === hint ? 0xb98a3d : selected ? 0xf3eada : 0x2b211a,
          1);
      cell.setInteractive({ useHandCursor: true }).on('pointerup', () => this.rotateTile(index));
      this.boardContainer?.add(cell);

      const mask = circuitMask(board, this.rotations, index);
      const pipe = this.add.graphics();
      pipe.lineStyle(13, 0x101c24, 1);
      pipe.lineBetween(cx, cy, cx, cy);
      pipe.lineStyle(9, color, 0.95);
      if (mask & 1) pipe.lineBetween(cx, cy, cx, cy - CELL_SIZE / 2 + 4);
      if (mask & 2) pipe.lineBetween(cx, cy, cx + CELL_SIZE / 2 - 4, cy);
      if (mask & 4) pipe.lineBetween(cx, cy, cx, cy + CELL_SIZE / 2 - 4);
      if (mask & 8) pipe.lineBetween(cx, cy, cx - CELL_SIZE / 2 + 4, cy);
      pipe.fillStyle(color, 1);
      pipe.fillCircle(cx, cy, 10);
      this.boardContainer?.add(pipe);

      if (index === board.sourceIndex || index === board.sinkIndex) {
        const label = this.add.text(cx, cy, index === board.sourceIndex ? 'S' : 'K', {
          color: '#1a1410', fontFamily: FONT.UI, fontSize: '11px', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.boardContainer?.add(label);
      }
    });

    const testButton = this.add.rectangle(GAME_WIDTH / 2, 396, 210, 40, 0x94342e, 0.96)
      .setStrokeStyle(1.5, 0x6d211d).setInteractive({ useHandCursor: true }).on('pointerup', () => this.testFlow());
    const testLabel = this.add.text(GAME_WIDTH / 2, 396, 'UJI ALIRAN', {
      color: '#FFF8EA', fontFamily: FONT.UI, fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.boardContainer.add([testButton, testLabel]);
  }

  private finish(): void {
    this.stage = 'success';
    this.balanceData.run.challenges['1999'] = this.chosenApproach;
    this.balanceData.run[this.chosenApproach] += 1;
    this.balanceData.save.saveCycle('1999', this.balanceData.run);
    this.boardContainer?.removeAll(true);

    // kartu sukses kertas legacy
    this.add.rectangle(GAME_WIDTH / 2, 265, 660, 170, 0xf3eada, 0.96);
    this.add.text(GAME_WIDTH / 2, 228, 'KAPSUL STABIL', {
      color: CSS.green, fontFamily: FONT.UI, fontSize: '27px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 275, 'Daya, pendingin, dan serum tersambung tanpa bocor.', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '16px',
    }).setOrigin(0.5);
    this.statusText?.setVisible(false);
    this.soundManager?.playSuccessFanfare();
    this.time.delayedCall(1000, () => {
      this.scene.stop();
      this.balanceData.onComplete();
    });
  }
}
