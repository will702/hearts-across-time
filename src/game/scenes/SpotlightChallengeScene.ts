import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

export type SpotlightChallengeData = {
  run: RunState;
  save: SaveSystem;
  onComplete: () => void;
};

const COVERS = [300, 480, 660];

export class SpotlightChallengeScene extends Phaser.Scene {
  private challengeData!: SpotlightChallengeData;
  private stage: 'choose' | 'play' | 'success' = 'choose';
  private chosenApproach: 'empathy' | 'logic' = 'empathy';
  private selectedChoice = 0;

  private playerX = 200;
  private beamX = 350;
  private beamWidth = 112;
  private misses = 0;
  private assisted = false;
  private feedbackText?: Phaser.GameObjects.Text;
  private playerSprite?: Phaser.GameObjects.Sprite;
  private beamGraphics?: Phaser.GameObjects.Graphics;
  private chooseContainer?: Phaser.GameObjects.Container;

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('SpotlightChallengeScene');
  }

  create(data: SpotlightChallengeData): void {
    this.challengeData = data;
    this.registry.set('nativeState', 'spotlight_challenge');
    this.stage = 'choose';
    this.selectedChoice = 0;
    this.playerX = 200;
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
      const spd = this.assisted ? 140 : 185;
      let dir = 0;
      if (this.keys) {
        if (this.keys.left.isDown || this.keys.a.isDown) dir -= 1;
        if (this.keys.right.isDown || this.keys.d.isDown) dir += 1;
      }

      this.playerX = Phaser.Math.Clamp(this.playerX + dir * spd * dt, 190, 764);
      if (this.playerSprite) {
        this.playerSprite.setX(this.playerX);
        if (dir !== 0) this.playerSprite.setFlipX(dir < 0);
      }

      const beamSpeed = this.assisted ? 0.6 : 0.92;
      const t = this.time.now / 1000;
      this.beamWidth = this.assisted ? 150 : 112;
      this.beamX = 190 + ((Math.sin(t * beamSpeed) + 1) / 2) * 580;

      this.drawBeam();

      const inCover = COVERS.some(cx => Math.abs(this.playerX - cx) < 36);
      const inBeam = Math.abs(this.playerX - this.beamX) < this.beamWidth / 2;

      if (inBeam && !inCover) {
        this.onDetected();
      } else if (this.playerX >= 758) {
        this.onFinish();
      }
    }
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050403, 0.94);
    if (this.textures.exists('bg1944-mid')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg1944-mid').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.2);
    }
    this.add.text(GAME_WIDTH / 2, 42, 'PENYEBERANGAN LAMPU SOROT', {
      color: '#f7d984', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.rectangle(GAME_WIDTH / 2, 385, 620, 8, 0x3d3025);

    COVERS.forEach(cx => {
      this.add.rectangle(cx, 370, 70, 30, 0x5a4838).setStrokeStyle(2, 0x8a7058);
      this.add.text(cx, 370, 'KARUNG', {
        color: '#f5f0e8aa', fontFamily: 'Poppins, sans-serif', fontSize: '9px',
      }).setOrigin(0.5);
    });

    this.beamGraphics = this.add.graphics();

    if (this.textures.exists('elena')) {
      this.playerSprite = this.add.sprite(this.playerX, 360, 'elena', 0)
        .setScale(0.85).setOrigin(0.5, 1).setVisible(false);
    }

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 450, '', {
      color: '#f6d57b', fontFamily: 'Poppins, sans-serif', fontSize: '13px',
    }).setOrigin(0.5);
  }

  private createChooseUI(): void {
    this.chooseContainer = this.add.container(0, 0);

    const sub = this.add.text(GAME_WIDTH / 2, 85, 'PILIH PENDEKATAN STRATEGIS:', {
      color: '#fffbf0', fontFamily: 'Patrick Hand, sans-serif', fontSize: '18px',
    }).setOrigin(0.5);

    const btn1Bg = this.add.rectangle(GAME_WIDTH / 2 - 170, 200, 310, 110, 0xd3a848, 0.95)
      .setStrokeStyle(2, 0x6a4930).setInteractive({ useHandCursor: true });
    const btn1Title = this.add.text(GAME_WIDTH / 2 - 170, 165, '1. EMPATI', {
      color: '#100c08', fontFamily: 'Cinzel, serif', fontSize: '15px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const btn1Desc = this.add.text(GAME_WIDTH / 2 - 170, 210, 'Alihkan sorot dari medis terluka.\n(Fokus pada perlindungan)', {
      color: '#100c08', fontFamily: 'Patrick Hand, sans-serif', fontSize: '14px', align: 'center',
    }).setOrigin(0.5);

    const btn2Bg = this.add.rectangle(GAME_WIDTH / 2 + 170, 200, 310, 110, 0x181410, 0.95)
      .setStrokeStyle(2, 0x6a4930).setInteractive({ useHandCursor: true });
    const btn2Title = this.add.text(GAME_WIDTH / 2 + 170, 165, '2. LOGIKA', {
      color: '#f5f0e8', fontFamily: 'Cinzel, serif', fontSize: '15px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const btn2Desc = this.add.text(GAME_WIDTH / 2 + 170, 210, 'Putus daya dan menyeberang langsung.\n(Fokus pada efisiensi misi)', {
      color: '#f5f0e8', fontFamily: 'Patrick Hand, sans-serif', fontSize: '14px', align: 'center',
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
    btn1Bg.setFillStyle(is1 ? 0xd3a848 : 0x181410, 0.95);
    btn1Title.setColor(is1 ? '#100c08' : '#f5f0e8');
    btn1Desc.setColor(is1 ? '#100c08' : '#f5f0e8');

    btn2Bg.setFillStyle(!is1 ? 0xd3a848 : 0x181410, 0.95);
    btn2Title.setColor(!is1 ? '#100c08' : '#f5f0e8');
    btn2Desc.setColor(!is1 ? '#100c08' : '#f5f0e8');
  }

  private startPlayStage(): void {
    this.chosenApproach = this.selectedChoice === 0 ? 'empathy' : 'logic';
    this.stage = 'play';
    this.chooseContainer?.setVisible(false);
    this.playerSprite?.setVisible(true);
    this.feedbackText?.setText('LARI KE KANAN (◀ / ▶ ATAU A / D) • BERLINDUNG DI BALIK KARUNG PASIR');
  }

  private drawBeam(): void {
    if (!this.beamGraphics) return;
    this.beamGraphics.clear();

    const topX = this.beamX;
    const topY = 90;
    const botL = this.beamX - this.beamWidth / 2;
    const botR = this.beamX + this.beamWidth / 2;
    const botY = 385;

    this.beamGraphics.fillStyle(0xffec99, 0.35);
    this.beamGraphics.beginPath();
    this.beamGraphics.moveTo(topX, topY);
    this.beamGraphics.lineTo(botR, botY);
    this.beamGraphics.lineTo(botL, botY);
    this.beamGraphics.closePath();
    this.beamGraphics.fill();

    this.beamGraphics.lineStyle(2, 0xfff4c2, 0.7);
    this.beamGraphics.strokeLineShape(new Phaser.Geom.Line(topX, topY, botL, botY));
    this.beamGraphics.strokeLineShape(new Phaser.Geom.Line(topX, topY, botR, botY));
  }

  private onDetected(): void {
    this.misses += 1;
    if (this.misses >= 3) this.assisted = true;
    this.playerX = 200;
    this.feedbackText?.setText(this.assisted ? 'TERDETEKSI — KEMBALI KE AWAL (BANTUAN AKTIF)' : 'TERDETEKSI — KEMBALI KE TITIK AWAL');
    if (!this.registry.get('reduceMotion')) {
      this.cameras.main.shake(180, 0.008);
    }
  }

  private onFinish(): void {
    this.stage = 'success';
    this.challengeData.run.challenges['1944'] = this.chosenApproach;
    this.challengeData.run[this.chosenApproach] += 1;
    this.challengeData.save.saveCycle('1944', this.challengeData.run, 765);

    this.feedbackText?.setText('PENYEBERANGAN BERHASIL! JALAN MENUJU ARTHUR TERBUKA.').setColor('#a3e635');
    this.beamGraphics?.clear();

    this.time.delayedCall(800, () => {
      this.scene.stop();
      this.challengeData.onComplete();
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
