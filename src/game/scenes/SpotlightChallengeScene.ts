import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
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
  private soundManager?: SoundManager;
  private stage: 'choose' | 'play' | 'success' = 'choose';
  private chosenApproach: 'empathy' | 'logic' = 'empathy';
  private selectedChoice = 0;

  private playerX = 200;
  private beamX = 350;
  private beamWidth = 112;
  private misses = 0;
  private assisted = false;
  private alertMeter = 0;
  private lastFootstepX = 200;
  private checkpointX = 200;
  private graceUntil = 0;
  private feedbackHoldUntil = 0;
  private lastHint = '';

  private feedbackText?: Phaser.GameObjects.Text;
  private alertBarGraphics?: Phaser.GameObjects.Graphics;
  private playerSprite?: Phaser.GameObjects.Sprite;
  private beamGraphics?: Phaser.GameObjects.Graphics;
  private dustParticles: { x: number; y: number; vx: number; vy: number; alpha: number; circle: Phaser.GameObjects.Arc }[] = [];
  private chooseContainer?: Phaser.GameObjects.Container;

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private touchMove = 0;

  constructor() {
    super('SpotlightChallengeScene');
  }

  create(data: SpotlightChallengeData): void {
    this.challengeData = data;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'spotlight_challenge');
    this.stage = 'choose';
    this.selectedChoice = 0;
    this.playerX = 200;
    this.misses = 0;
    this.assisted = false;
    this.alertMeter = 0;
    this.lastFootstepX = 200;
    this.checkpointX = 200;
    this.lastHint = '';

    this.createBackground();
    this.createChooseUI();
    this.createInputHandlers();
    if (!this.registry.get('reduceMotion')) this.createDustParticles();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.updateDustParticles(dt);

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
      const spd = this.assisted ? 220 : 190;
      let dir = this.touchMove;
      if (this.keys) {
        if (this.keys.left.isDown || this.keys.a.isDown) dir -= 1;
        if (this.keys.right.isDown || this.keys.d.isDown) dir += 1;
      }
      dir = Phaser.Math.Clamp(dir, -1, 1);

      this.playerX = Phaser.Math.Clamp(this.playerX + dir * spd * dt, 190, 765);
      if (Math.abs(this.playerX - this.lastFootstepX) > 28) {
        this.lastFootstepX = this.playerX;
        this.soundManager?.playFootstep('metal', this.playerX);
      }

      if (this.playerSprite) {
        this.playerSprite.setX(this.playerX);
        if (dir !== 0) this.playerSprite.setFlipX(dir < 0);
      }

      const beamSpeed = this.assisted ? 0.62 : 0.95;
      const t = this.time.now / 1000;
      this.beamWidth = this.assisted ? 80 : 110;
      // Sinusoidal sweep with ease near edges
      this.beamX = 190 + ((Math.sin(t * beamSpeed) + 1) / 2) * 575;

      this.drawBeam();

      const inCover = COVERS.some(cx => Math.abs(this.playerX - cx) < 38);
      const inBeam = Math.abs(this.playerX - this.beamX) < this.beamWidth / 2;

      if (inCover) {
        const cover = COVERS.find(cx => Math.abs(this.playerX - cx) < 38);
        if (cover && cover > this.checkpointX) this.checkpointX = cover;
      }

      if (this.playerSprite) {
        this.playerSprite.setTint(inCover ? 0x94a3b8 : (inBeam ? 0xfef08a : 0xffffff));
      }

      if (this.time.now >= this.graceUntil && inBeam && !inCover) {
        this.alertMeter += dt * 3.2;
        if (this.alertMeter >= 1.0) {
          this.onDetected();
          return;
        }
      } else {
        this.alertMeter = Math.max(0, this.alertMeter - dt * 2.0);
      }

      this.drawAlertBar();
      this.updateHint(inCover, inBeam);

      if (this.playerX >= 758) {
        this.onFinish();
      }
    }
  }

  snapshot(): Record<string, unknown> {
    return {
      minigame: 'spotlight',
      stage: this.stage,
      playerX: this.playerX,
      beamX: this.beamX,
      covers: COVERS,
      misses: this.misses,
      assisted: this.assisted,
      checkpointX: this.checkpointX,
    };
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050403, 0.94);
    if (this.textures.exists('bg1944-mid')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg1944-mid').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.22);
    }
    this.add.text(GAME_WIDTH / 2, 40, 'PENYEBERANGAN LAMPU SOROT', {
      color: '#f7d984', fontFamily: 'Cinzel, serif', fontSize: '24px', fontStyle: 'bold',
      stroke: '#1a0f08', strokeThickness: 5,
    }).setOrigin(0.5);

    // Ground Platform
    this.add.rectangle(GAME_WIDTH / 2, 385, 620, 8, 0x3d3025);

    // Sandbag Cover Points
    COVERS.forEach(cx => {
      this.add.rectangle(cx, 370, 74, 30, 0x5a4838).setStrokeStyle(2, 0x8a7058);
      this.add.text(cx, 370, '🛡️ PERLINDUNGAN', {
        color: '#f5f0e8cc', fontFamily: 'Poppins, sans-serif', fontSize: '9px', fontStyle: 'bold',
      }).setOrigin(0.5);
    });

    this.beamGraphics = this.add.graphics();
    this.alertBarGraphics = this.add.graphics();

    if (this.textures.exists('elena')) {
      this.playerSprite = this.add.sprite(this.playerX, 360, 'elena', 0)
        .setScale(0.85).setOrigin(0.5, 1).setVisible(false);
    }

    this.feedbackText = this.add.text(GAME_WIDTH / 2, 436, '', {
      color: '#f6d57b', fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.createTouchControls();
  }

  private createTouchControls(): void {
    const leftBtn = this.add.rectangle(260, 485, 110, 44, 0x1f1712, 0.9)
      .setStrokeStyle(2, 0x6a4930).setInteractive({ useHandCursor: true });
    this.add.text(260, 485, '◀ LARI KIRI', {
      color: '#fff8ea', fontFamily: 'Poppins, sans-serif', fontSize: '12px',
    }).setOrigin(0.5);

    const rightBtn = this.add.rectangle(700, 485, 110, 44, 0x1f1712, 0.9)
      .setStrokeStyle(2, 0x6a4930).setInteractive({ useHandCursor: true });
    this.add.text(700, 485, 'LARI KANAN ▶', {
      color: '#fff8ea', fontFamily: 'Poppins, sans-serif', fontSize: '12px',
    }).setOrigin(0.5);

    leftBtn.on('pointerdown', () => { this.touchMove = -1; });
    leftBtn.on('pointerup', () => { this.touchMove = 0; });
    leftBtn.on('pointerout', () => { this.touchMove = 0; });

    rightBtn.on('pointerdown', () => { this.touchMove = 1; });
    rightBtn.on('pointerup', () => { this.touchMove = 0; });
    rightBtn.on('pointerout', () => { this.touchMove = 0; });
  }

  private createDustParticles(): void {
    for (let i = 0; i < 20; i++) {
      const circle = this.add.arc(
        Phaser.Math.Between(190, 770),
        Phaser.Math.Between(120, 380),
        Phaser.Math.Between(1, 3),
        0, 360, false, 0xfff3b0, 0.5,
      );
      this.dustParticles.push({
        x: circle.x,
        y: circle.y,
        vx: Phaser.Math.FloatBetween(-12, 12),
        vy: Phaser.Math.FloatBetween(-8, 8),
        alpha: Phaser.Math.FloatBetween(0.2, 0.6),
        circle,
      });
    }
  }

  private updateDustParticles(dt: number): void {
    this.dustParticles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 190) p.x = 770;
      if (p.x > 770) p.x = 190;
      if (p.y < 110) p.y = 380;
      if (p.y > 380) p.y = 110;
      p.circle.setPosition(p.x, p.y);

      // Light up dust when inside beam
      const inBeam = Math.abs(p.x - this.beamX) < this.beamWidth / 2;
      p.circle.setAlpha(inBeam ? p.alpha * 1.8 : p.alpha * 0.4);
    });
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
    this.graceUntil = this.time.now + 900;
    this.setHint('TAHAN KANAN UNTUK MAJU • BERHENTI DI KARUNG SAAT CAHAYA MENDEKAT');
    this.soundManager?.playConfirm();
  }

  private drawBeam(): void {
    if (!this.beamGraphics) return;
    this.beamGraphics.clear();

    const topX = this.beamX;
    const topY = 85;
    const botL = this.beamX - this.beamWidth / 2;
    const botR = this.beamX + this.beamWidth / 2;
    const botY = 385;

    // Volumetric Beam Inner Cone
    this.beamGraphics.fillStyle(0xffec99, 0.38);
    this.beamGraphics.beginPath();
    this.beamGraphics.moveTo(topX, topY);
    this.beamGraphics.lineTo(botR, botY);
    this.beamGraphics.lineTo(botL, botY);
    this.beamGraphics.closePath();
    this.beamGraphics.fill();

    // Beam Outer Border Lines
    this.beamGraphics.lineStyle(2, 0xfff4c2, 0.8);
    this.beamGraphics.strokeLineShape(new Phaser.Geom.Line(topX, topY, botL, botY));
    this.beamGraphics.strokeLineShape(new Phaser.Geom.Line(topX, topY, botR, botY));

    // Spotlight Source Emitter Lens
    this.beamGraphics.fillStyle(0xfffbeb, 0.9);
    this.beamGraphics.fillCircle(topX, topY, 10);
  }

  private drawAlertBar(): void {
    if (!this.alertBarGraphics) return;
    this.alertBarGraphics.clear();

    const progress = Phaser.Math.Clamp((this.playerX - 190) / 575, 0, 1);
    this.alertBarGraphics.fillStyle(0x180f0c, 0.72);
    this.alertBarGraphics.fillRect(190, 408, 575, 5);
    this.alertBarGraphics.fillStyle(0x86efac, 0.9);
    this.alertBarGraphics.fillRect(190, 408, 575 * progress, 5);

    if (this.alertMeter > 0.05) {
      const px = this.playerX;
      const py = 310;
      const w = 48;
      const h = 6;

      this.alertBarGraphics.fillStyle(0x180f0c, 0.8);
      this.alertBarGraphics.fillRect(px - w / 2, py, w, h);

      const fillW = Phaser.Math.Clamp(w * this.alertMeter, 0, w);
      this.alertBarGraphics.fillStyle(this.alertMeter > 0.7 ? 0xef4444 : 0xf59e0b, 1);
      this.alertBarGraphics.fillRect(px - w / 2, py, fillW, h);
    }
  }

  private onDetected(): void {
    this.misses += 1;
    if (this.misses >= 2) this.assisted = true;
    this.alertMeter = 0;
    this.playerX = this.checkpointX;
    this.playerSprite?.setX(this.playerX);
    this.graceUntil = this.time.now + 850;
    this.feedbackHoldUntil = this.graceUntil;
    this.soundManager?.playErrorBuzz();
    this.setHint(this.assisted
      ? 'TERDETEKSI — BANTUAN AKTIF, LANJUT DARI PERLINDUNGAN TERAKHIR'
      : 'TERDETEKSI — LANJUT DARI PERLINDUNGAN TERAKHIR', '#ef4444');
    if (!this.registry.get('reduceMotion')) {
      this.cameras.main.shake(180, 0.008);
    }
  }

  private onFinish(): void {
    this.stage = 'success';
    this.challengeData.run.challenges['1944'] = this.chosenApproach;
    this.challengeData.run[this.chosenApproach] += 1;
    this.challengeData.save.saveCycle('1944', this.challengeData.run, 765);

    this.soundManager?.playSuccessFanfare();
    this.feedbackText?.setText('PENYEBERANGAN BERHASIL! JALAN MENUJU ARTHUR TERBUKA.').setColor('#86efac');
    this.beamGraphics?.clear();
    this.alertBarGraphics?.clear();

    this.time.delayedCall(850, () => {
      this.scene.stop();
      this.challengeData.onComplete();
    });
  }

  private updateHint(inCover: boolean, inBeam: boolean): void {
    if (this.time.now < this.feedbackHoldUntil) return;
    if (inCover) {
      this.setHint('AMAN — TUNGGU CAHAYA LEWAT, LALU MAJU', '#86efac');
    } else if (inBeam) {
      this.setHint('BAHAYA — CAPAI PERLINDUNGAN TERDEKAT!', '#fca5a5');
    } else {
      this.setHint('MAJU KE KANAN • KARUNG PASIR ADALAH TITIK AMAN');
    }
  }

  private setHint(text: string, color = '#f6d57b'): void {
    if (text === this.lastHint) return;
    this.lastHint = text;
    this.feedbackText?.setText(text).setColor(color);
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
