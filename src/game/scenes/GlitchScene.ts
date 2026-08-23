import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

export type GlitchSceneData = {
  run: RunState;
};

const CASE_FILES: Record<string, string> = {
  A1: 'BERKAS KASUS A1 — misi ditinggalkan: penelitian tak pernah selesai',
  A2: 'BERKAS KASUS A2 — obsesi & paradoks mengunci masa depan',
  B1: 'BERKAS KASUS B1 — formula bocor, disalahgunakan jadi senjata',
  B2: 'BERKAS KASUS B2 — kapsul terkunci oleh kebencian',
};

function getLoopHint(routeB2: string): string {
  if (routeB2 === 'A1') return '⟩ Petunjuk: kabur membuat penelitian tak pernah selesai — jangan tinggalkan misinya.';
  if (routeB2 === 'A2') return '⟩ Petunjuk: memaksa atau membawa Arthur Tua ke 2088 memicu paradoks — ada pilihan yang lebih ikhlas.';
  if (routeB2 === 'B1') return '⟩ Petunjuk: data yang bocor ke publik justru disalahgunakan — formula perlu disimpan lebih aman.';
  if (routeB2 === 'B2') return '⟩ Petunjuk: Arthur hanya terbuka pada kenangan yang hangat — jawablah dengan empati sejak 1944.';
  return '⟩ Petunjuk: setiap pilihanmu di masa lalu membentuk takdir 2088.';
}

export class GlitchScene extends Phaser.Scene {
  private glitchData!: GlitchSceneData;
  private soundManager?: SoundManager;
  private save!: SaveSystem;

  constructor() {
    super('GlitchScene');
  }

  create(data: GlitchSceneData): void {
    this.glitchData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.registry.set('nativeState', 'glitch');

    this.soundManager?.playGlitch();

    const routeB2 = data.run.routeB2 || '';
    const caseTitle = CASE_FILES[routeB2] || 'BERKAS KASUS — TIMELINE RUNTUH';
    const hint = getLoopHint(routeB2);

    data.run.loop += 1;
    data.run.empathy = 0;
    data.run.logic = 0;
    data.run.routeB1 = '';
    data.run.routeB2 = '';
    data.run.watchRepaired = false;
    data.run.roseRepaired = false;
    data.run.gemAligned = false;
    data.run.photoRepaired = false;
    data.run.challenges = { '1944': null, '1968': null, '1999': null };
    data.run.inventory = {};
    data.run.watchTargets = null;

    this.save.clearCycle();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x110204, 1);

    this.add.text(GAME_WIDTH / 2, 85, '⚠ DISTORSI WAKTU — TIMELINE COLLAPSE ⚠', {
      color: '#ef4444', fontFamily: 'Cinzel, serif', fontSize: '22px', fontStyle: 'bold',
      stroke: '#450a0a', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 170, caseTitle, {
      color: '#fca5a5', fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 250, hint, {
      color: '#fff', fontFamily: 'Patrick Hand, sans-serif', fontSize: '19px', wordWrap: { width: 720 }, align: 'center',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 360, `[ SIKLUS KE-${data.run.loop} DIMULAI KEMBALI DI 1944 ]`, {
      color: '#fbbf24', fontFamily: 'Cinzel, serif', fontSize: '16px', letterSpacing: 2,
    }).setOrigin(0.5);

    if (!this.registry.get('reduceMotion')) {
      this.cameras.main.shake(600, 0.018);
    }

    this.time.delayedCall(2200, () => {
      this.scene.start('VortexScene', {
        to: '1944',
        rewind: true,
        run: this.glitchData.run,
      });
    });
  }
}
