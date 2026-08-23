import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

export type SignalTuneData = {
  run: RunState;
  save: SaveSystem;
  onComplete: () => void;
};

const TARGETS = [0.3, 0.72, 0.48];

export class SignalTuneScene extends Phaser.Scene {
  private tuneData!: SignalTuneData;
  private stage: 'choose' | 'play' | 'success' = 'choose';
  private chosenApproach: 'empathy' | 'logic' = 'empathy';
  private selectedChoice = 0;

  private band = 0;
  private cursor = 0.5;
  private dir = 1;
  private misses = 0;
  private assisted = false;

  private feedbackText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private chooseContainer?: Phaser.GameObjects.Container;
  private waveGraphics?: Phaser.GameObjects.Graphics;

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('SignalTuneScene');
  }

  create(data: SignalTuneData): void {
    this.tuneData = data;
    this.registry.set('nativeState', 'signaltune');
    this.stage = 'choose';
    this.band = 0;
    this.cursor = 0.5;
    this.misses = 0;
    this.assisted = false;

    this.createBackground();
    this.createChooseUI();
    this.createInputHandlers();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    if (this.stage === 'choose') {
      if (this.keys) {
        if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a)) {
          this.selectedChoice = 0;
          this.refreshChoiceUI();
        } else if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d)) {
          this.selectedChoice = 1;
          this.refreshChoiceUI();
        } else if (Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.space)) {
          this.startPlayStage();
        }
      }
      return;
    }

    if (this.stage === 'play') {
      const speed = this.assisted ? 0.42 : 0.75;
      this.cursor += this.dir * dt * speed;
      if (this.cursor >= 1) {
        this.cursor = 1;
        this.dir = -1;
      } else if (this.cursor <= 0) {
        this.cursor = 0;
        this.dir = 1;
      }

      if (this.keys) {
        let steer = 0;
        if (this.keys.left.isDown || this.keys.a.isDown) steer -= 1;
        if (this.keys.right.isDown || this.keys.d.isDown) steer += 1;
        if (steer !== 0) {
          this.cursor = Phaser.Math.Clamp(this.cursor + steer * dt * 0.5, 0, 1);
          this.dir = steer > 0 ? 1 : -1;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
          this.tryLock();
        }
      }

      this.drawWaveform();
    }
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x070b10, 0.95);
    this.add.text(GAME_WIDTH / 2, 42, 'PENYETELAN SINYAL RADIO', {
      color: '#7dd3fc', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.waveGraphics = this.add.graphics();

    this.statusText = this.add.text(GAME_WIDTH / 2, 85, '', {
      color: '#f5f0e8', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 440, '', {
      color: '#7dd3fc', fontFamily: 'Poppins, sans-serif', fontSize: '13px',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 480, 'KUNCI SAAT INDIKATOR COCOK DENGAN TARGET (SPACE / ENTER)', {
      backgroundColor: '#0369a1dd', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '12px', padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setInteractive().on('pointerup', () => this.tryLock());
  }

  private createChooseUI(): void {
    this.chooseContainer = this.add.container(0, 0);

    const sub = this.add.text(GAME_WIDTH / 2, 85, 'PILIH PENDEKATAN PENYETELAN SINYAL:', {
      color: '#fffbf0', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    const btn1Bg = this.add.rectangle(GAME_WIDTH / 2 - 170, 200, 310, 110, 0x38bdf8, 0.95)
      .setStrokeStyle(2, 0x0284c7).setInteractive({ useHandCursor: true });
    const btn1Title = this.add.text(GAME_WIDTH / 2 - 170, 165, '1. EMPATI', {
      color: '#082f49', fontFamily: 'Cinzel, serif', fontSize: '15px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const btn1Desc = this.add.text(GAME_WIDTH / 2 - 170, 210, 'Ikuti frekuensi panggilan Arthur.\n(Fokus pada resonansi emosi)', {
      color: '#082f49', fontFamily: 'Patrick Hand, sans-serif', fontSize: '14px', align: 'center',
    }).setOrigin(0.5);

    const btn2Bg = this.add.rectangle(GAME_WIDTH / 2 + 170, 200, 310, 110, 0x0f172a, 0.95)
      .setStrokeStyle(2, 0x0284c7).setInteractive({ useHandCursor: true });
    const btn2Title = this.add.text(GAME_WIDTH / 2 + 170, 165, '2. LOGIKA', {
      color: '#f8fafc', fontFamily: 'Cinzel, serif', fontSize: '15px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const btn2Desc = this.add.text(GAME_WIDTH / 2 + 170, 210, 'Isolasi pembawa data formula.\n(Fokus pada kestabilan spektrum)', {
      color: '#f8fafc', fontFamily: 'Patrick Hand, sans-serif', fontSize: '14px', align: 'center',
    }).setOrigin(0.5);

    btn1Bg.on('pointerup', () => { this.selectedChoice = 0; this.startPlayStage(); });
    btn2Bg.on('pointerup', () => { this.selectedChoice = 1; this.startPlayStage(); });

    this.chooseContainer.add([sub, btn1Bg, btn1Title, btn1Desc, btn2Bg, btn2Title, btn2Desc]);
  }

  private refreshChoiceUI(): void {
    if (!this.chooseContainer) return;
    const btn1Bg = this.chooseContainer.getAt(1) as Phaser.GameObjects.Rectangle;
    const btn1Title = this.chooseContainer.getAt(2) as Phaser.GameObjects.Text;
    const btn1Desc = this.chooseContainer.getAt(3) as Phaser.GameObjects.Text;
    const btn2Bg = this.chooseContainer.getAt(4) as Phaser.GameObjects.Rectangle;
    const btn2Title = this.chooseContainer.getAt(5) as Phaser.GameObjects.Text;
    const btn2Desc = this.chooseContainer.getAt(6) as Phaser.GameObjects.Text;

    const is1 = this.selectedChoice === 0;
    btn1Bg.setFillStyle(is1 ? 0x38bdf8 : 0x0f172a, 0.95);
    btn1Title.setColor(is1 ? '#082f49' : '#f8fafc');
    btn1Desc.setColor(is1 ? '#082f49' : '#f8fafc');

    btn2Bg.setFillStyle(!is1 ? 0x38bdf8 : 0x0f172a, 0.95);
    btn2Title.setColor(!is1 ? '#082f49' : '#f8fafc');
    btn2Desc.setColor(!is1 ? '#082f49' : '#f8fafc');
  }

  private startPlayStage(): void {
    this.chosenApproach = this.selectedChoice === 0 ? 'empathy' : 'logic';
    this.stage = 'play';
    this.chooseContainer?.setVisible(false);
    this.statusText?.setText(`GELOMBANG 1 / 3 • TARGET: ${Math.round(TARGETS[0] * 100)}%`);
    this.feedbackText?.setText('SELARASKAN INDIKATOR DENGAN TARGET FREKUENSI');
  }

  private drawWaveform(): void {
    if (!this.waveGraphics) return;
    this.waveGraphics.clear();

    const trackL = 190;
    const trackR = 770;
    const trackW = trackR - trackL;
    const trackY = 260;

    this.waveGraphics.fillStyle(0x0f172a, 0.8);
    this.waveGraphics.fillRect(trackL, trackY - 60, trackW, 120);
    this.waveGraphics.lineStyle(2, 0x1e293b, 1);
    this.waveGraphics.strokeRect(trackL, trackY - 60, trackW, 120);

    const targetX = trackL + TARGETS[this.band] * trackW;
    const winW = (this.assisted ? 0.13 : 0.075) * trackW;

    this.waveGraphics.fillStyle(0x22c55e, 0.35);
    this.waveGraphics.fillRect(targetX - winW, trackY - 55, winW * 2, 110);
    this.waveGraphics.lineStyle(2, 0x4ade80, 0.9);
    this.waveGraphics.strokeLineShape(new Phaser.Geom.Line(targetX, trackY - 55, targetX, trackY + 55));

    const curX = trackL + this.cursor * trackW;
    this.waveGraphics.fillStyle(0x38bdf8, 0.9);
    this.waveGraphics.fillCircle(curX, trackY, 9);
    this.waveGraphics.lineStyle(3, 0xbae6fd, 1);
    this.waveGraphics.strokeLineShape(new Phaser.Geom.Line(curX, trackY - 55, curX, trackY + 55));

    this.waveGraphics.lineStyle(2, 0x0284c7, 0.6);
    this.waveGraphics.beginPath();
    for (let x = trackL; x <= trackR; x += 4) {
      const p = (x - trackL) / trackW;
      const freq = 12 + this.cursor * 20;
      const y = trackY + Math.sin(p * Math.PI * freq) * 28;
      if (x === trackL) this.waveGraphics.moveTo(x, y);
      else this.waveGraphics.lineTo(x, y);
    }
    this.waveGraphics.stroke();
  }

  private tryLock(): void {
    if (this.stage !== 'play') return;
    const target = TARGETS[this.band];
    const win = this.assisted ? 0.13 : 0.075;
    const dist = Math.abs(this.cursor - target);

    if (dist <= win) {
      this.band += 1;
      if (this.band >= 3) {
        this.onFinish();
      } else {
        this.statusText?.setText(`GELOMBANG ${this.band + 1} / 3 • TARGET: ${Math.round(TARGETS[this.band] * 100)}%`);
        this.feedbackText?.setText(`TERKUNCI ${this.band} / 3`).setColor('#4ade80');
      }
    } else {
      this.misses += 1;
      if (this.misses >= 3) this.assisted = true;
      this.feedbackText?.setText(this.assisted ? 'SINYAL LEPAS — BANTUAN AKTIF' : 'SINYAL LEPAS — COBA LAGI').setColor('#f87171');
      if (!this.registry.get('reduceMotion')) {
        this.cameras.main.shake(150, 0.005);
      }
    }
  }

  private onFinish(): void {
    this.stage = 'success';
    this.tuneData.run.challenges['1968'] = this.chosenApproach;
    this.tuneData.run[this.chosenApproach] += 1;
    this.tuneData.save.saveCycle('1968', this.tuneData.run);

    this.statusText?.setText('SEMUA GELOMBANG FREKUENSI SELARAS!').setColor('#4ade80');
    this.feedbackText?.setText('TRANSMISI BERHASIL DISINKRONISASI').setColor('#a3e635');

    this.time.delayedCall(800, () => {
      this.scene.stop();
      this.tuneData.onComplete();
    });
  }

  private createInputHandlers(): void {
    this.keys = this.input.keyboard?.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }
}
