import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  applyEvacuationStep,
  evacuationBoardsForLoop,
  evacuationPursuerIntervalForLoop,
  nextEvacuationStep,
  samePoint,
  type EvacuationBoard,
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

const CELL_WIDTH = 74;
const CELL_HEIGHT = 44;
const MAP_TOP = 148;
const PANEL = { x: 48, y: 36, w: 864, h: 468 };

export class SpotlightChallengeScene extends Phaser.Scene {
  private challengeData!: SpotlightChallengeData;
  private soundManager?: SoundManager;
  private stage: 'choose' | 'play' | 'success' = 'choose';
  private chosenApproach: 'empathy' | 'logic' = 'empathy';
  private selectedChoice = 0;
  private round = 0;
  private boards: readonly EvacuationBoard[] = [];
  private path: GridPoint[] = [];
  private cursor: GridPoint = { x: 0, y: 0 };
  private carryingPatient = false;
  private carriedPatient?: GridPoint;
  private remainingPatients: GridPoint[] = [];
  private rescuedPatients = 0;
  private pursuer: GridPoint = { x: 0, y: 0 };
  private pursuerElapsed = 0;
  private pursuerInterval = 2200;
  private pursuerMoves = 0;
  private caughtCount = 0;
  private misses = 0;
  private assisted = false;

  private chooseContainer?: Phaser.GameObjects.Container;
  private boardContainer?: Phaser.GameObjects.Container;
  private statusText?: Phaser.GameObjects.Text;
  private chaseText?: Phaser.GameObjects.Text;
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
    this.boards = evacuationBoardsForLoop(data.run.loop);
    this.path = [];
    this.carryingPatient = false;
    this.carriedPatient = undefined;
    this.remainingPatients = [];
    this.rescuedPatients = 0;
    this.pursuerElapsed = 0;
    this.pursuerInterval = evacuationPursuerIntervalForLoop(data.run.loop);
    this.pursuerMoves = 0;
    this.caughtCount = 0;
    this.misses = 0;
    this.assisted = false;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x04060a, 0.76);
    if (this.textures.exists('bg1944-mid')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg1944-mid').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.16);
    }
    addPaperPanel(this, PANEL.x, PANEL.y, PANEL.w, PANEL.h, { radius: 9 });
    this.add.text(GAME_WIDTH / 2, 68, 'PETA EVAKUASI GARIS DEPAN — 1944', {
      color: CSS.red, fontFamily: FONT.UI, fontSize: '23px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 98, 'Selamatkan semua pasien sebelum pengejar menyusulmu. Hindari sektor berbahaya.', {
      color: '#5A4A3C', fontFamily: FONT.META, fontSize: '13px',
    }).setOrigin(0.5);
    this.chaseText = this.add.text(GAME_WIDTH / 2, 126, '', {
      color: CSS.red, fontFamily: FONT.META, fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false);

    this.boardContainer = this.add.container(0, 0).setVisible(false);
    this.statusText = this.add.text(GAME_WIDTH / 2, 404, 'Pilih cara membaca medan evakuasi.', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '15px', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 474, 'PANAH / WASD — FOKUS   •   SPACE / ENTER — PILIH   •   BACKSPACE — MUNDUR', {
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

  update(_time: number, delta: number): void {
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
      this.updateObjectiveText();
      this.renderBoard();
    }
    this.updatePursuer(delta);
  }

  snapshot(): Record<string, unknown> {
    const board = this.boards[this.round];
    return {
      minigame: 'evacuation_map',
      stage: this.stage,
      round: this.round,
      loopVariant: this.challengeData.run.loop % 8,
      board: board ? {
        width: board.width,
        height: board.height,
        start: board.start,
        patient: board.patient,
        patients: board.patients,
        goal: board.goal,
        pursuerStart: board.pursuer,
        blocked: board.blocked,
      } : null,
      path: this.path,
      cursor: this.cursor,
      carryingPatient: this.carryingPatient,
      remainingPatients: this.remainingPatients,
      rescuedPatients: this.rescuedPatients,
      patientCount: board?.patients.length ?? 0,
      pursuer: this.pursuer,
      pursuerMoveInMs: Math.max(0, Math.ceil(this.pursuerInterval - this.pursuerElapsed)),
      pursuerMoves: this.pursuerMoves,
      caughtCount: this.caughtCount,
      misses: this.misses,
      assisted: this.assisted,
      hintCell: this.assisted && board ? nextEvacuationStep(this.objectiveBoard(board), this.path) : null,
    };
  }

  /** Kartu pendekatan kertas legacy: wash merah + gores tinta bila terpilih. */
  private createChooseUI(): void {
    this.chooseContainer = this.add.container(0, 0);
    const subtitle = this.add.text(GAME_WIDTH / 2, 142, 'PILIH PENDEKATAN EVAKUASI:', {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '17px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const entries = [
      { x: 320, title: '1. EMPATI', desc: 'Dahulukan korban paling rentan.\n(Fokus pada keselamatan manusia)' },
      { x: 640, title: '2. LOGIKA', desc: 'Cari jalur tercepat yang masih aman.\n(Fokus pada efisiensi rute)' },
    ];
    entries.forEach((entry, index) => {
      const bg = this.add.rectangle(entry.x, 250, 290, 130, 0x5a4a3c, 0.06)
        .setStrokeStyle(1.5, 0x2b211a, 0.4).setInteractive({ useHandCursor: true })
        .on('pointerup', () => { this.selectApproach(index); this.startPlayStage(); });
      const title = this.add.text(entry.x, 217, entry.title, {
        color: CSS.body, fontFamily: FONT.UI, fontSize: '17px',
      }).setOrigin(0.5);
      const desc = this.add.text(entry.x, 265, entry.desc, {
        color: CSS.body, fontFamily: FONT.UI, fontSize: '15px', align: 'center',
      }).setOrigin(0.5);
      this.chooseContainer?.add([bg, title, desc]);
    });
    this.chooseContainer.add(subtitle);
    const chooseHint = this.add.text(GAME_WIDTH / 2, 366, '← → pilih  •  ENTER konfirmasi', {
      color: '#6A5B4B', fontFamily: FONT.UI, fontSize: '14px',
    }).setOrigin(0.5);
    this.chooseContainer.add(chooseHint);
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
    this.chaseText?.setVisible(true);
    this.startRound();
  }

  private startRound(): void {
    const board = this.boards[this.round];
    this.carryingPatient = false;
    this.carriedPatient = undefined;
    this.remainingPatients = board.patients.map(patient => ({ ...patient }));
    this.rescuedPatients = 0;
    this.pursuer = { ...board.pursuer };
    this.pursuerElapsed = 0;
    this.path = [{ ...board.start }];
    this.cursor = { ...board.start };
    this.updateObjectiveText();
    this.renderBoard();
  }

  private moveCursor(dx: number, dy: number): void {
    const board = this.boards[this.round];
    this.cursor = {
      x: Phaser.Math.Clamp(this.cursor.x + dx, 0, board.width - 1),
      y: Phaser.Math.Clamp(this.cursor.y + dy, 0, board.height - 1),
    };
    this.soundManager?.playSelect();
    this.renderBoard();
  }

  private commit(point: GridPoint): void {
    if (this.stage !== 'play') return;
    const board = this.boards[this.round];
    if (!this.carryingPatient && samePoint(point, board.goal) && this.remainingPatients.length > 0) {
      this.rejectStep('JEMPUT SALAH SATU PASIEN SEBELUM MENUJU TITIK MERAH');
      return;
    }
    const result = applyEvacuationStep(board, this.path, point);
    this.path = result.path;
    if (result.result === 'invalid') {
      this.rejectStep('PILIH PETAK TERBUKA YANG BERSEBELAHAN');
    } else {
      this.cursor = { ...this.path[this.path.length - 1] };
      this.soundManager?.playLockSuccess();

      const patientIndex = this.remainingPatients.findIndex(patient => samePoint(this.cursor, patient));
      if (!this.carryingPatient && patientIndex >= 0) {
        this.carriedPatient = this.remainingPatients.splice(patientIndex, 1)[0];
        this.carryingPatient = true;
        this.path = [{ ...this.cursor }];
        this.statusText?.setText('PASIEN DIANGKAT — CEPAT BAWA KE TITIK MERAH').setColor(CSS.green);
        this.renderBoard();
        return;
      }

      if (this.carryingPatient && samePoint(this.cursor, board.goal)) {
        this.carryingPatient = false;
        this.carriedPatient = undefined;
        this.rescuedPatients += 1;
        this.path = [{ ...board.goal }];
        this.cursor = { ...board.goal };
        this.pursuer = { ...board.pursuer };
        this.pursuerElapsed = 0;

        if (this.remainingPatients.length > 0) {
          this.statusText?.setText(`PASIEN ${this.rescuedPatients}/${board.patients.length} AMAN — JEMPUT KORBAN BERIKUTNYA`).setColor(CSS.green);
          this.renderBoard();
          return;
        }
        if (this.round === this.boards.length - 1) {
          this.finish();
          return;
        }
        this.statusText?.setText('SEMUA KORBAN PETA INI AMAN — BUKA PETA BERIKUTNYA').setColor(CSS.green);
        this.time.delayedCall(420, () => {
          this.round += 1;
          this.startRound();
        });
        return;
      }
    }
    if (this.checkPursuerCatch()) return;
    this.renderBoard();
  }

  private rejectStep(message: string): void {
    this.misses += 1;
    this.assisted = this.misses >= 2;
    this.soundManager?.playErrorBuzz();
    this.statusText?.setText(this.assisted
      ? `${message} — PETAK SARAN DISOROT EMAS`
      : message).setColor(CSS.redBright);
    this.renderBoard();
  }

  private updateObjectiveText(): void {
    const objective = this.carryingPatient
      ? 'BAWA PASIEN KE TITIK MERAH'
      : `JEMPUT ${this.remainingPatients.length} PASIEN YANG TERSISA`;
    const board = this.boards[this.round];
    this.statusText?.setText(`EVAKUASI ${this.round + 1}/3 • AMAN ${this.rescuedPatients}/${board.patients.length} — ${objective}`).setColor(CSS.body);
  }

  private objectiveBoard(board: EvacuationBoard): EvacuationBoard {
    return this.carryingPatient
      ? board
      : { ...board, goal: this.remainingPatients[0] ?? board.goal };
  }

  private updatePursuer(delta: number): void {
    if (this.stage !== 'play') return;
    this.pursuerElapsed += Math.min(delta, 100);
    const seconds = Math.max(0, (this.pursuerInterval - this.pursuerElapsed) / 1000);
    this.chaseText?.setText(`⚠ PENGEJAR BERGERAK DALAM ${seconds.toFixed(1)} DETIK`);
    if (this.pursuerElapsed < this.pursuerInterval) return;

    this.pursuerElapsed -= this.pursuerInterval;
    const board = this.boards[this.round];
    const playerPosition = this.path[this.path.length - 1];
    const chaseBoard = { ...board, goal: playerPosition };
    const next = nextEvacuationStep(chaseBoard, [this.pursuer]);
    if (next) this.pursuer = { ...next };
    this.pursuerMoves += 1;
    this.soundManager?.playGearTick(0.72);
    if (!this.checkPursuerCatch()) this.renderBoard();
  }

  private checkPursuerCatch(): boolean {
    const playerPosition = this.path[this.path.length - 1];
    if (!samePoint(this.pursuer, playerPosition)) return false;

    const board = this.boards[this.round];
    if (this.carryingPatient && this.carriedPatient) {
      this.remainingPatients.unshift({ ...this.carriedPatient });
    }
    this.carryingPatient = false;
    this.carriedPatient = undefined;
    this.caughtCount += 1;
    this.misses += 1;
    this.assisted = this.misses >= 2;
    this.pursuer = { ...board.pursuer };
    this.pursuerElapsed = 0;
    const restart = this.rescuedPatients > 0 ? board.goal : board.start;
    this.path = [{ ...restart }];
    this.cursor = { ...restart };
    this.soundManager?.playErrorBuzz();
    this.statusText?.setText('PENGEJAR MENYUSULMU — PASIEN YANG DIBAWA KEMBALI KE PETA!').setColor(CSS.redBright);
    if (!this.registry.get('reduceMotion')) this.cameras.main.shake(180, 0.006);
    this.renderBoard();
    return true;
  }

  private renderBoard(): void {
    if (!this.boardContainer || this.stage !== 'play') return;
    this.boardContainer.removeAll(true);
    const board = this.boards[this.round];
    const originX = (GAME_WIDTH - board.width * CELL_WIDTH) / 2;
    const graphics = this.add.graphics();
    graphics.lineStyle(4, this.carryingPatient ? 0x567a61 : 0x55677a, 0.85);
    for (let index = 1; index < this.path.length; index += 1) {
      const from = this.path[index - 1];
      const to = this.path[index];
      graphics.lineBetween(
        originX + from.x * CELL_WIDTH + CELL_WIDTH / 2,
        MAP_TOP + from.y * CELL_HEIGHT + CELL_HEIGHT / 2,
        originX + to.x * CELL_WIDTH + CELL_WIDTH / 2,
        MAP_TOP + to.y * CELL_HEIGHT + CELL_HEIGHT / 2,
      );
    }
    this.boardContainer.add(graphics);
    const hint = this.assisted ? nextEvacuationStep(this.objectiveBoard(board), this.path) : null;

    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const point = { x, y };
        const cx = originX + x * CELL_WIDTH + CELL_WIDTH / 2;
        const cy = MAP_TOP + y * CELL_HEIGHT + CELL_HEIGHT / 2;
        const blocked = board.blocked.some(cell => samePoint(cell, point));
        const used = this.path.some(cell => samePoint(cell, point));
        const isGoal = samePoint(board.goal, point);
        const isPatient = this.remainingPatients.some(patient => samePoint(patient, point));
        const isStart = samePoint(board.start, point);
        const isHint = Boolean(hint && samePoint(hint, point));
        const cell = this.add.rectangle(cx, cy, CELL_WIDTH - 8, CELL_HEIGHT - 6,
          blocked ? 0x94342e : used ? 0x567a61 : 0xf3eada, blocked ? 0.16 : used ? 0.3 : 1)
          .setStrokeStyle(isHint ? 4 : samePoint(this.cursor, point) ? 3 : 1.4,
            isHint ? 0xb98a3d : samePoint(this.cursor, point) ? 0x94342e : 0x2b211a,
            isHint ? 1 : samePoint(this.cursor, point) ? 1 : 0.35)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => { this.cursor = point; this.commit(point); });
        const patientWaiting = isPatient;
        const label = this.add.text(cx, cy, blocked ? '✕' : isStart ? '◆' : used ? '•' : '', {
          color: blocked ? CSS.redBright : CSS.green,
          fontFamily: FONT.UI, fontSize: '17px', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.boardContainer.add([cell, label]);

        if (isGoal) {
          const goalMarker = this.add.circle(cx, cy, 9, 0x94342e, 1)
            .setStrokeStyle(3, 0xf3eada, 1);
          this.boardContainer.add(goalMarker);
        } else if (patientWaiting) {
          const patientMarker = this.add.circle(cx, cy, 13, 0xf3eada, 0.9)
            .setStrokeStyle(4, 0x55677a, 1);
          this.boardContainer.add(patientMarker);
        }

        if (this.carryingPatient && samePoint(this.cursor, point)) {
          const carried = this.add.circle(cx + 18, cy - 18, 8, 0x55677a, 1)
            .setStrokeStyle(3, 0xf3eada, 1);
          this.boardContainer.add(carried);
        }
      }
    }

    const pursuerX = originX + this.pursuer.x * CELL_WIDTH + CELL_WIDTH / 2;
    const pursuerY = MAP_TOP + this.pursuer.y * CELL_HEIGHT + CELL_HEIGHT / 2;
    const pursuerMarker = this.add.circle(pursuerX, pursuerY, 13, 0x631f1b, 1)
      .setStrokeStyle(4, 0xf6d57b, 1);
    const pursuerLabel = this.add.text(pursuerX, pursuerY, '!', {
      color: '#fff8ea', fontFamily: FONT.UI, fontSize: '16px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.boardContainer.add([pursuerMarker, pursuerLabel]);
  }

  private finish(): void {
    this.stage = 'success';
    this.challengeData.run.challenges['1944'] = this.chosenApproach;
    this.challengeData.run[this.chosenApproach] += 1;
    this.challengeData.save.saveCycle('1944', this.challengeData.run, 765);
    this.boardContainer?.removeAll(true);
    this.chaseText?.setVisible(false);

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
