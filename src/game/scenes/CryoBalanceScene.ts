import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  CIRCUIT_BOARDS,
  circuitMask,
  firstCircuitHint,
  isCircuitComplete,
} from '../minigames/challengeRules';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

export type CryoBalanceData = {
  run: RunState;
  save: SaveSystem;
  onComplete: () => void;
};

const CELL_SIZE = 82;
const GRID_TOP = 116;

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

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x040810, 0.97);
    if (this.textures.exists('bg1999-mid')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg1999-mid').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.1);
    }
    this.add.text(GAME_WIDTH / 2, 34, 'SIRKUIT PENDINGIN KAPSUL — 1999', {
      color: '#67e8f9', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
      stroke: '#083344', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 68, 'Sambungkan daya, pendingin, dan serum tanpa jalur bocor.', {
      color: '#cffafe', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    this.boardContainer = this.add.container(0, 0).setVisible(false);
    this.statusText = this.add.text(GAME_WIDTH / 2, 426, 'Pilih prioritas pemulihan kapsul.', {
      backgroundColor: '#071521e8', color: '#67e8f9', fontFamily: 'Poppins, sans-serif',
      fontSize: '13px', padding: { x: 18, y: 9 }, align: 'center',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 500, 'PANAH / WASD — FOKUS   •   SPACE — PUTAR   •   ENTER — UJI ALIRAN', {
      color: '#94a3b8', fontFamily: 'Poppins, sans-serif', fontSize: '11px',
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
    const board = CIRCUIT_BOARDS[this.system];
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
        rotation: this.rotations[index] ?? 0,
        targetRotation: 0,
      })) ?? [],
      focusIndex: this.focusIndex,
      testFailures: this.testFailures,
      assisted: this.assisted,
      hintTile: this.assisted && board ? firstCircuitHint(board, this.rotations) : null,
    };
  }

  private createChooseUI(): void {
    this.chooseContainer = this.add.container(0, 0);
    const subtitle = this.add.text(GAME_WIDTH / 2, 112, 'PILIH PRIORITAS PEMULIHAN KAPSUL:', {
      color: '#fffbf0', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);
    const entries = [
      { x: 310, title: '1. EMPATI', desc: 'Pulihkan jalur penunjang hidup dahulu.\n(Menjaga Arthur tetap aman)', color: 0x9f1239 },
      { x: 650, title: '2. LOGIKA', desc: 'Pulihkan sistem sesuai dependensi.\n(Menjaga formula tetap murni)', color: 0x0e7490 },
    ];
    entries.forEach((entry, index) => {
      const bg = this.add.rectangle(entry.x, 230, 310, 116, entry.color, 0.95)
        .setStrokeStyle(index ? 2 : 3, index ? 0x155e75 : 0xf7d984)
        .setInteractive({ useHandCursor: true }).on('pointerup', () => {
          this.selectApproach(index);
          this.startPlay();
        });
      const title = this.add.text(entry.x, 197, entry.title, {
        color: '#fff', fontFamily: 'Cinzel, serif', fontSize: '15px', fontStyle: 'bold',
      }).setOrigin(0.5);
      const desc = this.add.text(entry.x, 245, entry.desc, {
        color: '#fff', fontFamily: 'Patrick Hand, sans-serif', fontSize: '14px', align: 'center',
      }).setOrigin(0.5);
      this.chooseContainer?.add([bg, title, desc]);
    });
    this.chooseContainer.add(subtitle);
  }

  private selectApproach(index: number): void {
    if (this.selectedChoice === index) return;
    this.selectedChoice = index;
    this.soundManager?.playSelect();
    if (!this.chooseContainer) return;
    [0, 3].forEach((childIndex, optionIndex) => {
      const selected = optionIndex === this.selectedChoice;
      const bg = this.chooseContainer?.getAt(childIndex) as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(selected ? 3 : 2, selected ? 0xf7d984 : optionIndex ? 0x155e75 : 0xbe123c);
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
    const board = CIRCUIT_BOARDS[this.system];
    this.rotations = board.tiles.map(tile => tile.initialRotation);
    this.focusIndex = board.tiles.findIndex(tile => tile.targetMask !== 0);
    this.statusText?.setText(`SISTEM ${this.system + 1}/3 — ${board.label}: PUTAR KONDUIT, LALU UJI ALIRAN`).setColor('#67e8f9');
    this.renderCircuit();
  }

  private moveFocus(dx: number, dy: number): void {
    const board = CIRCUIT_BOARDS[this.system];
    let x = this.focusIndex % board.width;
    let y = Math.floor(this.focusIndex / board.width);
    const attempts = dx ? board.width : board.height;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      x = Phaser.Math.Wrap(x + dx, 0, board.width);
      y = Phaser.Math.Wrap(y + dy, 0, board.height);
      const index = y * board.width + x;
      if (board.tiles[index].targetMask) {
        this.focusIndex = index;
        this.soundManager?.playSelect();
        this.renderCircuit();
        return;
      }
    }
  }

  private rotateTile(index: number): void {
    const board = CIRCUIT_BOARDS[this.system];
    if (this.stage !== 'play' || !board.tiles[index]?.targetMask) return;
    this.focusIndex = index;
    this.rotations[index] = (this.rotations[index] + 1) % 4;
    this.soundManager?.playGearTick(0.9 + this.system * 0.1);
    this.renderCircuit();
  }

  private testFlow(): void {
    if (this.stage !== 'play') return;
    const board = CIRCUIT_BOARDS[this.system];
    if (!isCircuitComplete(board, this.rotations)) {
      this.testFailures += 1;
      this.assisted = this.testFailures >= 2;
      this.soundManager?.playErrorBuzz();
      this.statusText?.setText(this.assisted
        ? 'ALIRAN BOCOR — KONDUIT YANG PERLU DIPERBAIKI DISOROT EMAS'
        : 'ALIRAN TERPUTUS ATAU BOCOR — PERIKSA SAMBUNGAN').setColor('#fca5a5');
      if (!this.registry.get('reduceMotion')) this.cameras.main.shake(130, 0.004);
      this.renderCircuit();
      return;
    }

    this.soundManager?.playSteamRelease();
    if (this.system === CIRCUIT_BOARDS.length - 1) {
      this.finish();
      return;
    }
    this.statusText?.setText('ALIRAN STABIL — MENGALIHKAN KE SISTEM BERIKUTNYA').setColor('#86efac');
    this.time.delayedCall(420, () => {
      this.system += 1;
      this.startSystem();
    });
  }

  private renderCircuit(): void {
    if (!this.boardContainer || this.stage !== 'play') return;
    this.boardContainer.removeAll(true);
    const board = CIRCUIT_BOARDS[this.system];
    const originX = (GAME_WIDTH - board.width * CELL_SIZE) / 2;
    const colors = [0xfacc15, 0x22d3ee, 0xfb7185];
    const color = colors[this.system];
    const hint = this.assisted ? firstCircuitHint(board, this.rotations) : null;

    board.tiles.forEach((tile, index) => {
      const x = index % board.width;
      const y = Math.floor(index / board.width);
      const cx = originX + x * CELL_SIZE + CELL_SIZE / 2;
      const cy = GRID_TOP + y * CELL_SIZE + CELL_SIZE / 2;
      const active = tile.targetMask !== 0;
      const selected = index === this.focusIndex;
      const cell = this.add.rectangle(cx, cy, CELL_SIZE - 7, CELL_SIZE - 7, active ? 0x0c2430 : 0x07131c, active ? 0.98 : 0.55)
        .setStrokeStyle(index === hint ? 4 : selected ? 3 : 1,
          index === hint ? 0xfacc15 : selected ? 0xffffff : 0x155e75,
          active ? 1 : 0.35);
      if (active) cell.setInteractive({ useHandCursor: true }).on('pointerup', () => this.rotateTile(index));
      this.boardContainer?.add(cell);
      if (!active) return;

      const mask = circuitMask(board, this.rotations, index);
      const pipe = this.add.graphics();
      pipe.lineStyle(13, 0x082f49, 1);
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
          color: '#020617', fontFamily: 'Poppins, sans-serif', fontSize: '11px', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.boardContainer?.add(label);
      }
    });

    const testButton = this.add.rectangle(GAME_WIDTH / 2, 390, 210, 40, 0x0e7490, 0.96)
      .setStrokeStyle(2, 0x67e8f9).setInteractive({ useHandCursor: true }).on('pointerup', () => this.testFlow());
    const testLabel = this.add.text(GAME_WIDTH / 2, 390, 'UJI ALIRAN', {
      color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.boardContainer.add([testButton, testLabel]);
  }

  private finish(): void {
    this.stage = 'success';
    this.balanceData.run.challenges['1999'] = this.chosenApproach;
    this.balanceData.run[this.chosenApproach] += 1;
    this.balanceData.save.saveCycle('1999', this.balanceData.run);
    this.boardContainer?.removeAll(true);
    this.statusText?.setText('DAYA, PENDINGIN, DAN SERUM TERSAMBUNG — KAPSUL SIAP DIBUKA').setColor('#86efac');
    this.soundManager?.playSuccessFanfare();
    this.time.delayedCall(950, () => {
      this.scene.stop();
      this.balanceData.onComplete();
    });
  }
}
