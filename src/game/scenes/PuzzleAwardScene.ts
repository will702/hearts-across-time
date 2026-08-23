import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { EndingKey, RunState, SaveSystem } from '../systems/SaveSystem';

export type PuzzleAwardData = {
  kind: 'loop' | 'true';
  run: RunState;
};

const ENDING_NAMES: Record<string, string> = {
  A1: 'KEPING 1/6 — KASUS A1 (PENELITIAN DITINGGALKAN)',
  B1: 'KEPING 2/6 — KASUS B1 (FORMULA DISALAHGUNAKAN)',
  B2lock: 'KEPING 3/6 — KASUS B2 (KAPSUL TERKUNCI)',
  rebut: 'KEPING 4/6 — KASUS REBUT PAKSA (DENDAM)',
  paradox: 'KEPING 5/6 — PARADOKS WAKTU 2088',
  true: 'KEPING 6/6 — TRUE ENDING: BREAK THE LOOP',
};

function getEndingKey(kind: 'loop' | 'true', run: RunState): EndingKey {
  if (kind === 'true') return 'true';
  if (run.routeB2 === 'A1') return 'A1';
  if (run.routeB2 === 'B1') return 'B1';
  if (run.routeB2 === 'B2') return 'B2lock';
  return 'paradox';
}

export class PuzzleAwardScene extends Phaser.Scene {
  private awardData!: PuzzleAwardData;
  private save!: SaveSystem;

  constructor() {
    super('PuzzleAwardScene');
  }

  create(data: PuzzleAwardData): void {
    this.awardData = data;
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.registry.set('nativeState', 'puzzleaward');

    const key = getEndingKey(data.kind, data.run);
    this.save.data.endings[key] = 1;
    this.save.save(this.save.data);

    const totalUnlocked = Object.keys(this.save.data.endings).length;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x07040a, 0.96);

    this.add.text(GAME_WIDTH / 2, 70, 'KEPINGAN TAKDIR TERBUKA', {
      color: '#f6d57b', fontFamily: 'Cinzel, serif', fontSize: '26px', fontStyle: 'bold',
      stroke: '#2a1608', strokeThickness: 5,
    }).setOrigin(0.5);

    const endingTitle = ENDING_NAMES[key] || 'KEPINGAN ENDING';
    this.add.text(GAME_WIDTH / 2, 160, endingTitle, {
      color: '#fff', fontFamily: 'Cinzel, serif', fontSize: '18px', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);

    if (this.textures.exists('bonus-puzzle-board')) {
      this.add.image(GAME_WIDTH / 2, 280, 'bonus-puzzle-board')
        .setDisplaySize(320, 180).setAlpha(0.75);
    } else {
      this.add.rectangle(GAME_WIDTH / 2, 280, 280, 140, 0x1f1418).setStrokeStyle(3, 0xd97706);
    }

    this.add.text(GAME_WIDTH / 2, 395, `TOTAL KEPING TERKUMPUL: ${totalUnlocked} / 6`, {
      color: '#fde047', fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontStyle: 'bold', letterSpacing: 2,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 465, 'LANJUTKAN', {
      backgroundColor: '#94342edd', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '14px', padding: { x: 28, y: 10 },
    }).setOrigin(0.5).setInteractive().on('pointerup', () => this.advance());

    this.input.keyboard?.once('keydown-SPACE', () => this.advance());
    this.input.keyboard?.once('keydown-ENTER', () => this.advance());
  }

  private advance(): void {
    if (this.awardData.kind === 'true') {
      this.scene.start('EndCardScene');
    } else {
      this.scene.start('GlitchScene', { run: this.awardData.run });
    }
  }
}
