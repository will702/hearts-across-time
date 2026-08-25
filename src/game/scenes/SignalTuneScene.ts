import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

export type SignalTuneData = { run: RunState; save: SaveSystem; onComplete: () => void };
type Approach = 'empathy' | 'logic';

const INTERCEPTS = [
  { clue: '“Kapsul dibuka saat mawar ____.”  •  pola:  • — • •', options: ['membeku', 'mekar', 'terbakar'], answer: 1 },
  { clue: '“Koordinat dipindah ke sektor ____.”  •  angka terenkripsi: 1-9-18', options: ['BARAT', 'UTARA', 'AIR'], answer: 2 },
  { clue: '“Jangan percaya ____ resmi.”  •  suara kedua menyebut waktu palsu', options: ['LAPORAN', 'ARTHUR', 'ELENA'], answer: 0 },
] as const;

export class SignalTuneScene extends Phaser.Scene {
  private tuneData!: SignalTuneData;
  private soundManager?: SoundManager;
  private stage: 'choose' | 'decode' | 'success' = 'choose';
  private approach: Approach = 'empathy';
  private selectedApproach = 0;
  private round = 0;
  private selected = 0;
  private misses = 0;
  private cards: Phaser.GameObjects.Container[] = [];
  private choicePanel?: Phaser.GameObjects.Container;
  private clueText?: Phaser.GameObjects.Text;
  private status?: Phaser.GameObjects.Text;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('SignalTuneScene');
  }

  create(data: SignalTuneData): void {
    this.tuneData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.stage = 'choose';
    this.round = 0;
    this.selected = 0;
    this.misses = 0;
    this.registry.set('nativeState', 'signaltune');

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x030b15, 0.97);
    if (this.textures.exists('bg1968A-mid')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg1968A-mid').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.12);
    }
    this.add.text(GAME_WIDTH / 2, 34, 'INTERSEPSI TRANSMISI — 1968', {
      color: '#67e8f9', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
      stroke: '#06131c', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 70, 'Dengarkan konteks, baca pola, lalu pulihkan kata yang sengaja dihapus.', {
      color: '#e0f2fe', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    this.createApproachPanel();
    this.clueText = this.add.text(GAME_WIDTH / 2, 142, '', {
      color: '#f8fafc', fontFamily: 'Patrick Hand, sans-serif', fontSize: '20px',
      align: 'center', wordWrap: { width: 760 },
    }).setOrigin(0.5).setVisible(false);
    this.status = this.add.text(GAME_WIDTH / 2, 425, 'Pilih cara membaca transmisi.', {
      backgroundColor: '#071521e8', color: '#bae6fd', fontFamily: 'Poppins, sans-serif',
      fontSize: '13px', padding: { x: 18, y: 10 }, align: 'center',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 492, 'PANAH / A-D — PILIH   •   SPACE / ENTER — KONFIRMASI', {
      color: '#94a3b8', fontFamily: 'Poppins, sans-serif', fontSize: '11px',
    }).setOrigin(0.5);

    this.keys = this.input.keyboard?.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,ENTER') as typeof this.keys;
  }

  update(): void {
    if (!this.keys || this.stage === 'success') return;
    const previous = Phaser.Input.Keyboard.JustDown(this.keys.LEFT) || Phaser.Input.Keyboard.JustDown(this.keys.UP)
      || Phaser.Input.Keyboard.JustDown(this.keys.A) || Phaser.Input.Keyboard.JustDown(this.keys.W);
    const next = Phaser.Input.Keyboard.JustDown(this.keys.RIGHT) || Phaser.Input.Keyboard.JustDown(this.keys.DOWN)
      || Phaser.Input.Keyboard.JustDown(this.keys.D) || Phaser.Input.Keyboard.JustDown(this.keys.S);
    const confirm = Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER);
    if (this.stage === 'choose') {
      if (previous || next) {
        this.selectedApproach = this.selectedApproach ? 0 : 1;
        this.soundManager?.playSelect();
        this.refreshApproachPanel();
      }
      if (confirm) this.startDecode();
      return;
    }
    if (previous) this.moveSelection(-1);
    if (next) this.moveSelection(1);
    if (confirm) this.submit(this.selected);
  }

  snapshot(): Record<string, unknown> {
    return {
      minigame: 'signal_decode', stage: this.stage, round: this.round, selected: this.selected,
      answer: INTERCEPTS[this.round]?.answer ?? null, misses: this.misses,
    };
  }

  private createApproachPanel(): void {
    this.choicePanel = this.add.container(0, 0);
    const definitions = [
      { x: 310, title: 'EMPATI', desc: 'Ikuti napas dan keraguan Arthur.', color: 0x2b6b70 },
      { x: 650, title: 'LOGIKA', desc: 'Pisahkan sandi dari derau mesin.', color: 0x28364f },
    ];
    definitions.forEach((entry, index) => {
      const bg = this.add.rectangle(entry.x, 245, 300, 112, entry.color, 0.95).setStrokeStyle(2, 0x67e8f9, 0.7)
        .setInteractive({ useHandCursor: true }).on('pointerup', () => {
          this.selectedApproach = index;
          this.startDecode();
        });
      const title = this.add.text(entry.x, 220, entry.title, {
        color: '#f8fafc', fontFamily: 'Cinzel, serif', fontSize: '16px', fontStyle: 'bold',
      }).setOrigin(0.5);
      const desc = this.add.text(entry.x, 260, entry.desc, {
        color: '#dbeafe', fontFamily: 'Patrick Hand, sans-serif', fontSize: '16px',
      }).setOrigin(0.5);
      this.choicePanel?.add([bg, title, desc]);
    });
    this.refreshApproachPanel();
  }

  private refreshApproachPanel(): void {
    if (!this.choicePanel) return;
    [0, 3].forEach((childIndex, optionIndex) => {
      const bg = this.choicePanel?.getAt(childIndex) as Phaser.GameObjects.Rectangle;
      bg?.setStrokeStyle(3, optionIndex === this.selectedApproach ? 0xf7d984 : 0x67e8f9, optionIndex === this.selectedApproach ? 1 : 0.45);
    });
  }

  private startDecode(): void {
    if (this.stage !== 'choose') return;
    this.approach = this.selectedApproach === 0 ? 'empathy' : 'logic';
    this.stage = 'decode';
    this.choicePanel?.setVisible(false);
    this.clueText?.setVisible(true);
    this.soundManager?.playConfirm();
    this.showRound();
  }

  private showRound(): void {
    this.cards.forEach(card => card.destroy());
    this.cards = [];
    this.selected = 0;
    const intercept = INTERCEPTS[this.round];
    this.clueText?.setText(`INTERSEPSI ${this.round + 1}/3\n${intercept.clue}`);
    intercept.options.forEach((option, index) => {
      const x = 250 + index * 230;
      const bg = this.add.rectangle(0, 0, 200, 74, 0x0d2233, 0.96).setStrokeStyle(2, 0x3b82a0, 0.8);
      const label = this.add.text(0, 0, option, { color: '#f8fafc', fontFamily: 'Poppins, sans-serif', fontSize: '14px' }).setOrigin(0.5);
      const card = this.add.container(x, 290, [bg, label]).setSize(200, 74).setInteractive({ useHandCursor: true })
        .on('pointerup', () => this.submit(index));
      this.cards.push(card);
    });
    this.status?.setText('Pilih kata yang cocok dengan konteks dan pola sandi.').setColor('#bae6fd');
    this.refreshCards();
  }

  private moveSelection(direction: number): void {
    this.selected = Phaser.Math.Wrap(this.selected + direction, 0, 3);
    this.soundManager?.playSelect();
    this.refreshCards();
  }

  private refreshCards(): void {
    this.cards.forEach((card, index) => {
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(index === this.selected ? 0x155e75 : 0x0d2233, 0.96)
        .setStrokeStyle(2, index === this.selected ? 0x67e8f9 : 0x3b82a0, 0.9);
    });
  }

  private submit(index: number): void {
    if (this.stage !== 'decode') return;
    if (index !== INTERCEPTS[this.round].answer) {
      this.misses += 1;
      this.soundManager?.playErrorBuzz();
      this.status?.setText(this.misses >= 2 ? 'Hilangkan pilihan yang bertentangan dengan bagian kalimat sebelum pola sandi.' : 'Kata itu membuat pesan tidak konsisten.').setColor('#fca5a5');
      return;
    }
    this.soundManager?.playLockSuccess();
    this.round += 1;
    if (this.round >= INTERCEPTS.length) this.finish();
    else this.showRound();
  }

  private finish(): void {
    this.stage = 'success';
    this.tuneData.run.challenges['1968'] = this.approach;
    this.tuneData.run[this.approach] += 1;
    this.tuneData.save.saveCycle('1968', this.tuneData.run);
    this.clueText?.setText('TRANSMISI PULIH\n“MAWAR MEKAR — SEKTOR AIR — JANGAN PERCAYA LAPORAN RESMI.”');
    this.status?.setText('BUKTI AUDIO DITAMBAHKAN KE KASUS ARTHUR.').setColor('#86efac');
    this.soundManager?.playSuccessFanfare();
    this.time.delayedCall(900, () => {
      this.scene.stop();
      this.tuneData.onComplete();
    });
  }
}
