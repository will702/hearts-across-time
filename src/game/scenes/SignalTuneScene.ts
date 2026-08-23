import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

export type SignalTuneData = {
  run: RunState;
  save: SaveSystem;
  onComplete: () => void;
};

const TARGETS = [0.30, 0.72, 0.48];

export class SignalTuneScene extends Phaser.Scene {
  private tuneData!: SignalTuneData;
  private soundManager?: SoundManager;
  private stage: 'choose' | 'play' | 'success' = 'choose';
  private chosenApproach: 'empathy' | 'logic' = 'empathy';
  private selectedChoice = 0;

  private band = 0;
  private cursor = 0.5;
  private dir = 1;
  private misses = 0;
  private assisted = false;
  private isDraggingSlider = false;

  private feedbackText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private snrText?: Phaser.GameObjects.Text;
  private chooseContainer?: Phaser.GameObjects.Container;
  private waveGraphics?: Phaser.GameObjects.Graphics;

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('SignalTuneScene');
  }

  create(data: SignalTuneData): void {
    this.tuneData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
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
          this.soundManager?.playSelect();
          this.refreshChoiceUI();
        } else if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d)) {
          this.selectedChoice = 1;
          this.soundManager?.playSelect();
          this.refreshChoiceUI();
        } else if (Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.space)) {
          this.startPlayStage();
        }
      }
      return;
    }

    if (this.stage === 'play') {
      const speed = this.assisted ? 0.38 : 0.65;
      if (!this.isDraggingSlider) {
        this.cursor += this.dir * dt * speed;
        if (this.cursor >= 1) {
          this.cursor = 1;
          this.dir = -1;
        } else if (this.cursor <= 0) {
          this.cursor = 0;
          this.dir = 1;
        }
      }

      if (this.keys) {
        let steer = 0;
        if (this.keys.left.isDown || this.keys.a.isDown) steer -= 1;
        if (this.keys.right.isDown || this.keys.d.isDown) steer += 1;
        if (steer !== 0) {
          this.cursor = Phaser.Math.Clamp(this.cursor + steer * dt * 0.55, 0, 1);
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
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050a12, 0.95);
    this.add.text(GAME_WIDTH / 2, 38, 'PENYETELAN GELOMBANG RADIO 1968', {
      color: '#7dd3fc', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
      stroke: '#032030', strokeThickness: 5,
    }).setOrigin(0.5);

    this.waveGraphics = this.add.graphics();

    this.statusText = this.add.text(GAME_WIDTH / 2, 75, '', {
      color: '#f5f0e8', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    this.snrText = this.add.text(GAME_WIDTH / 2, 375, 'SINYAL: 0%', {
      color: '#38bdf8', fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 425, '', {
      color: '#7dd3fc', fontFamily: 'Poppins, sans-serif', fontSize: '13px',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 478, 'KUNCI FREKUENSI (SPACE / ENTER / SENTUH DI SINI)', {
      backgroundColor: '#0284c7dd', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '13px', padding: { x: 22, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.tryLock());
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

    btn1Bg.on('pointerup', () => { this.selectedChoice = 0; this.soundManager?.playConfirm(); this.startPlayStage(); });
    btn2Bg.on('pointerup', () => { this.selectedChoice = 1; this.soundManager?.playConfirm(); this.startPlayStage(); });

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
    this.statusText?.setText(`SALURAN ${this.band + 1} / 3 • TARGET: ${Math.round(TARGETS[0] * 100)} MHz`);
    this.feedbackText?.setText('SELARASKAN INDIKATOR DENGAN ZONA HIJAU SPEKTRUM');
    this.soundManager?.playConfirm();
  }

  private drawWaveform(): void {
    if (!this.waveGraphics) return;
    this.waveGraphics.clear();

    const trackL = 190;
    const trackR = 770;
    const trackW = trackR - trackL;
    const trackY = 220;

    // Oscilloscope CRT Frame
    this.waveGraphics.fillStyle(0x031322, 0.92);
    this.waveGraphics.fillRect(trackL, trackY - 90, trackW, 180);
    this.waveGraphics.lineStyle(2, 0x0369a1, 1);
    this.waveGraphics.strokeRect(trackL, trackY - 90, trackW, 180);

    // Grid lines
    this.waveGraphics.lineStyle(1, 0x0c4a6e, 0.4);
    for (let x = trackL + 40; x < trackR; x += 40) {
      this.waveGraphics.strokeLineShape(new Phaser.Geom.Line(x, trackY - 90, x, trackY + 90));
    }
    for (let y = trackY - 60; y < trackY + 90; y += 30) {
      this.waveGraphics.strokeLineShape(new Phaser.Geom.Line(trackL, y, trackR, y));
    }

    const targetX = trackL + TARGETS[this.band] * trackW;
    const winW = (this.assisted ? 0.14 : 0.08) * trackW;
    const curX = trackL + this.cursor * trackW;
    const dist = Math.abs(this.cursor - TARGETS[this.band]);
    const snr = Math.max(0, 1 - dist / 0.25);

    // Target Range Box
    this.waveGraphics.fillStyle(0x22c55e, 0.3);
    this.waveGraphics.fillRect(targetX - winW, trackY - 85, winW * 2, 170);
    this.waveGraphics.lineStyle(2, 0x4ade80, 0.9);
    this.waveGraphics.strokeLineShape(new Phaser.Geom.Line(targetX, trackY - 85, targetX, trackY + 85));

    // Dynamic Multi-Harmonic Oscilloscope Sine Wave
    const t = this.time.now / 1000;
    this.waveGraphics.lineStyle(2.5, snr > 0.7 ? 0x4ade80 : 0x38bdf8, 0.95);
    this.waveGraphics.beginPath();

    const noiseFactor = (1 - snr) * 14;
    for (let x = trackL; x <= trackR; x += 3) {
      const p = (x - trackL) / trackW;
      const freq1 = 8 + this.cursor * 24;
      const freq2 = 14 + TARGETS[this.band] * 12;
      const noise = (Math.sin(x * 12.3 + t * 20) * Math.cos(x * 5.7)) * noiseFactor;
      const y = trackY + Math.sin(p * Math.PI * freq1 + t * 4) * 32 * snr
                       + Math.sin(p * Math.PI * freq2 - t * 2) * 14
                       + noise;
      if (x === trackL) this.waveGraphics.moveTo(x, y);
      else this.waveGraphics.lineTo(x, y);
    }
    this.waveGraphics.stroke();

    // Slider Needle Indicator
    this.waveGraphics.fillStyle(0x38bdf8, 1);
    this.waveGraphics.fillCircle(curX, trackY, 8);
    this.waveGraphics.lineStyle(3, 0xffffff, 1);
    this.waveGraphics.strokeLineShape(new Phaser.Geom.Line(curX, trackY - 85, curX, trackY + 85));

    this.snrText?.setText(`KEJERNIHAN SINYAL (SNR): ${Math.round(snr * 100)}%`)
      .setColor(snr > 0.75 ? '#86efac' : (snr > 0.4 ? '#fde047' : '#38bdf8'));
  }

  private tryLock(): void {
    if (this.stage !== 'play') return;
    const target = TARGETS[this.band];
    const win = this.assisted ? 0.14 : 0.08;
    const dist = Math.abs(this.cursor - target);

    if (dist <= win) {
      this.soundManager?.playLockSuccess();
      this.band += 1;
      if (this.band >= 3) {
        this.onFinish();
      } else {
        this.statusText?.setText(`SALURAN ${this.band + 1} / 3 • TARGET: ${Math.round(TARGETS[this.band] * 100)} MHz`);
        this.feedbackText?.setText(`FREKUENSI ${this.band} / 3 BERHASIL TERKUNCI`).setColor('#86efac');
      }
    } else {
      this.misses += 1;
      if (this.misses >= 3) this.assisted = true;
      this.soundManager?.playErrorBuzz();
      this.feedbackText?.setText(this.assisted ? 'SINYAL MELESET — BANTUAN AKTIF' : 'SINYAL MELESET — KUNCI PADA ZONA HIJAU').setColor('#f87171');
      if (!this.registry.get('reduceMotion')) {
        this.cameras.main.shake(140, 0.005);
      }
    }
  }

  private onFinish(): void {
    this.stage = 'success';
    this.tuneData.run.challenges['1968'] = this.chosenApproach;
    this.tuneData.run[this.chosenApproach] += 1;
    this.tuneData.save.saveCycle('1968', this.tuneData.run);

    this.soundManager?.playSuccessFanfare();
    this.statusText?.setText('SEMUA GELOMBANG FREKUENSI SELARAS!').setColor('#86efac');
    this.feedbackText?.setText('TRANSMISI BERHASIL DISINKRONISASI KE TAHUN 1968').setColor('#a3e635');

    this.time.delayedCall(900, () => {
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

    // Direct pointer drag on oscilloscope bar
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.stage !== 'play') return;
      if (pointer.x >= 190 && pointer.x <= 770 && pointer.y >= 130 && pointer.y <= 310) {
        this.isDraggingSlider = true;
        this.cursor = Phaser.Math.Clamp((pointer.x - 190) / 580, 0, 1);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingSlider) {
        this.cursor = Phaser.Math.Clamp((pointer.x - 190) / 580, 0, 1);
      }
    });

    this.input.on('pointerup', () => {
      this.isDraggingSlider = false;
    });
  }
}
