import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

export type CryoBalanceData = {
  run: RunState;
  save: SaveSystem;
  onComplete: () => void;
};

export class CryoBalanceScene extends Phaser.Scene {
  private balanceData!: CryoBalanceData;
  private stage: 'choose' | 'play' | 'success' = 'choose';
  private chosenApproach: 'empathy' | 'logic' = 'empathy';
  private selectedChoice = 0;

  private vit = 0;
  private vitDir = 1;
  private vitLocked = false;
  private readonly targetVit = 0.62;

  private ser = 0;
  private serDir = 1;
  private serLocked = false;
  private readonly targetSer = 0.68;

  private step = 0;
  private misses = 0;
  private assisted = false;

  private statusText?: Phaser.GameObjects.Text;
  private feedbackText?: Phaser.GameObjects.Text;
  private chooseContainer?: Phaser.GameObjects.Container;
  private gaugeGraphics?: Phaser.GameObjects.Graphics;

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('CryoBalanceScene');
  }

  create(data: CryoBalanceData): void {
    this.balanceData = data;
    this.registry.set('nativeState', 'cryobalance');
    this.stage = 'choose';
    this.step = 0;
    this.vit = 0;
    this.vitDir = 1;
    this.vitLocked = false;
    this.ser = 0;
    this.serDir = 1;
    this.serLocked = false;
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
      const spd = this.assisted ? 0.7 : 1.0;

      if (!this.vitLocked) {
        this.vit += this.vitDir * dt * 1.6 * spd;
        if (this.vit >= 1) {
          this.vit = 1;
          this.vitDir = -1;
        } else if (this.vit <= 0) {
          this.vit = 0;
          this.vitDir = 1;
        }
      }

      if (!this.serLocked) {
        this.ser += this.serDir * dt * 2.1 * spd;
        if (this.ser >= 1) {
          this.ser = 1;
          this.serDir = -1;
        } else if (this.ser <= 0) {
          this.ser = 0;
          this.serDir = 1;
        }
      }

      if (this.keys && (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter))) {
        this.tryLockStep();
      }

      this.drawGauges();
    }
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050810, 0.95);
    this.add.text(GAME_WIDTH / 2, 42, 'STABILISASI KAPSUL KRIOGENIK', {
      color: '#67e8f9', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.gaugeGraphics = this.add.graphics();

    this.statusText = this.add.text(GAME_WIDTH / 2, 85, '', {
      color: '#f5f0e8', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 430, '', {
      color: '#67e8f9', fontFamily: 'Poppins, sans-serif', fontSize: '13px',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 480, 'KUNCI PARAMETER (SPACE / ENTER)', {
      backgroundColor: '#0891b2dd', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '13px', padding: { x: 20, y: 9 },
    }).setOrigin(0.5).setInteractive().on('pointerup', () => this.tryLockStep());
  }

  private createChooseUI(): void {
    this.chooseContainer = this.add.container(0, 0);

    const sub = this.add.text(GAME_WIDTH / 2, 85, 'PILIH PRIORITAS STABILISASI KRIO:', {
      color: '#fffbf0', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    const btn1Bg = this.add.rectangle(GAME_WIDTH / 2 - 170, 200, 310, 110, 0xf43f5e, 0.95)
      .setStrokeStyle(2, 0xbe123c).setInteractive({ useHandCursor: true });
    const btn1Title = this.add.text(GAME_WIDTH / 2 - 170, 165, '1. EMPATI', {
      color: '#fff', fontFamily: 'Cinzel, serif', fontSize: '15px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const btn1Desc = this.add.text(GAME_WIDTH / 2 - 170, 210, 'Dahulukan tanda vital Arthur.\n(Menjaga detak jantung stabil)', {
      color: '#fff', fontFamily: 'Patrick Hand, sans-serif', fontSize: '14px', align: 'center',
    }).setOrigin(0.5);

    const btn2Bg = this.add.rectangle(GAME_WIDTH / 2 + 170, 200, 310, 110, 0x0e7490, 0.95)
      .setStrokeStyle(2, 0x155e75).setInteractive({ useHandCursor: true });
    const btn2Title = this.add.text(GAME_WIDTH / 2 + 170, 165, '2. LOGIKA', {
      color: '#fff', fontFamily: 'Cinzel, serif', fontSize: '15px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const btn2Desc = this.add.text(GAME_WIDTH / 2 + 170, 210, 'Dahulukan kemurnian serum.\n(Menjaga formula sub-zero murni)', {
      color: '#fff', fontFamily: 'Patrick Hand, sans-serif', fontSize: '14px', align: 'center',
    }).setOrigin(0.5);

    btn1Bg.on('pointerup', () => { this.selectedChoice = 0; this.startPlayStage(); });
    btn2Bg.on('pointerup', () => { this.selectedChoice = 1; this.startPlayStage(); });

    this.chooseContainer.add([sub, btn1Bg, btn1Title, btn1Desc, btn2Bg, btn2Title, btn2Desc]);
  }

  private refreshChoiceUI(): void {
    if (!this.chooseContainer) return;
    const btn1Bg = this.chooseContainer.getAt(1) as Phaser.GameObjects.Rectangle;
    const btn2Bg = this.chooseContainer.getAt(4) as Phaser.GameObjects.Rectangle;

    const is1 = this.selectedChoice === 0;
    btn1Bg.setFillStyle(is1 ? 0xf43f5e : 0x4c0519, 0.95);
    btn2Bg.setFillStyle(!is1 ? 0x06b6d4 : 0x083344, 0.95);
  }

  private startPlayStage(): void {
    this.chosenApproach = this.selectedChoice === 0 ? 'empathy' : 'logic';
    this.stage = 'play';
    this.chooseContainer?.setVisible(false);
    this.statusText?.setText('TAHAP 1: KUNCI TANDA VITAL MERAH');
    this.feedbackText?.setText('TEKAN SPACE / ENTER SAAT INDIKATOR MERAH DI ZONA TARGET');
  }

  private drawGauges(): void {
    if (!this.gaugeGraphics) return;
    this.gaugeGraphics.clear();

    const trackL = 200;
    const trackR = 760;
    const trackW = trackR - trackL;
    const winW = (this.assisted ? 0.16 : 0.10) * trackW;

    // Track 1: Vital (Red)
    const y1 = 200;
    this.gaugeGraphics.fillStyle(0x1f1315, 0.9);
    this.gaugeGraphics.fillRect(trackL, y1 - 25, trackW, 50);
    this.gaugeGraphics.lineStyle(2, 0x881337, 1);
    this.gaugeGraphics.strokeRect(trackL, y1 - 25, trackW, 50);

    const targetX1 = trackL + this.targetVit * trackW;
    this.gaugeGraphics.fillStyle(0xf43f5e, 0.35);
    this.gaugeGraphics.fillRect(targetX1 - winW, y1 - 22, winW * 2, 44);
    this.gaugeGraphics.lineStyle(2, 0xfb7185, 0.9);
    this.gaugeGraphics.strokeLineShape(new Phaser.Geom.Line(targetX1, y1 - 22, targetX1, y1 + 22));

    const curX1 = trackL + this.vit * trackW;
    this.gaugeGraphics.fillStyle(this.vitLocked ? 0x22c55e : 0xf43f5e, 0.95);
    this.gaugeGraphics.fillCircle(curX1, y1, 11);
    this.gaugeGraphics.lineStyle(2, 0xffffff, 1);
    this.gaugeGraphics.strokeCircle(curX1, y1, 11);

    // Track 2: Serum (Blue)
    const y2 = 310;
    this.gaugeGraphics.fillStyle(0x0c1a24, 0.9);
    this.gaugeGraphics.fillRect(trackL, y2 - 25, trackW, 50);
    this.gaugeGraphics.lineStyle(2, 0x0e7490, 1);
    this.gaugeGraphics.strokeRect(trackL, y2 - 25, trackW, 50);

    const targetX2 = trackL + this.targetSer * trackW;
    this.gaugeGraphics.fillStyle(0x06b6d4, 0.35);
    this.gaugeGraphics.fillRect(targetX2 - winW, y2 - 22, winW * 2, 44);
    this.gaugeGraphics.lineStyle(2, 0x67e8f9, 0.9);
    this.gaugeGraphics.strokeLineShape(new Phaser.Geom.Line(targetX2, y2 - 22, targetX2, y2 + 22));

    const curX2 = trackL + this.ser * trackW;
    this.gaugeGraphics.fillStyle(this.serLocked ? 0x22c55e : 0x06b6d4, 0.95);
    this.gaugeGraphics.fillCircle(curX2, y2, 11);
    this.gaugeGraphics.lineStyle(2, 0xffffff, 1);
    this.gaugeGraphics.strokeCircle(curX2, y2, 11);
  }

  private tryLockStep(): void {
    if (this.stage !== 'play') return;
    const win = this.assisted ? 0.16 : 0.10;

    if (this.step === 0) {
      if (Math.abs(this.vit - this.targetVit) <= win) {
        this.vitLocked = true;
        this.step = 1;
        this.statusText?.setText('TAHAP 2: KUNCI KEMURNIAN SERUM BIRU');
        this.feedbackText?.setText('VITAL MERAH TERKUNCI (1/2)! SEKARANG KUNCI SERUM BIRU').setColor('#86efac');
      } else {
        this.onMiss();
      }
    } else if (this.step === 1) {
      if (Math.abs(this.ser - this.targetSer) <= win) {
        this.serLocked = true;
        this.onFinish();
      } else {
        this.onMiss();
      }
    }
  }

  private onMiss(): void {
    this.misses += 1;
    if (this.misses >= 3) this.assisted = true;
    this.vitLocked = false;
    this.serLocked = false;
    this.step = 0;
    this.statusText?.setText('TAHAP 1: KUNCI TANDA VITAL MERAH');
    this.feedbackText?.setText(this.assisted ? 'GARIS BELUM PAS — BANTUAN AKTIF' : 'GARIS BELUM PAS — KUNCI SAAT MENYENTUH AMBANG').setColor('#f87171');
    if (!this.registry.get('reduceMotion')) {
      this.cameras.main.shake(140, 0.005);
    }
  }

  private onFinish(): void {
    this.stage = 'success';
    this.balanceData.run.challenges['1999'] = this.chosenApproach;
    this.balanceData.run[this.chosenApproach] += 1;
    this.balanceData.save.saveCycle('1999', this.balanceData.run);

    this.statusText?.setText('STABILISASI KAPSUL KRIOGENIK SELESAI!').setColor('#4ade80');
    this.feedbackText?.setText('KEMURNIAN SERUM DAN VITAL SELARAS 100%').setColor('#a3e635');

    this.time.delayedCall(800, () => {
      this.scene.stop();
      this.balanceData.onComplete();
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
