import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { SaveSystem } from '../systems/SaveSystem';

export class IntroScene extends Phaser.Scene {
  private video?: Phaser.GameObjects.Video;
  private isPlaying = false;
  private preplayContainer?: Phaser.GameObjects.Container;
  private skipButton?: Phaser.GameObjects.Text;

  constructor() {
    super('IntroScene');
  }

  create(): void {
    this.isPlaying = false;
    this.registry.set('nativeState', 'intro');

    // Base dark background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x030408);

    if (this.textures.exists('title-bg-color')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'title-bg-color')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setAlpha(0.35);
    }

    // Video instance
    this.video = this.add.video(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'intro');
    this.fitVideo();

    this.video.on(Phaser.GameObjects.Events.VIDEO_CREATED, () => this.fitVideo());
    this.video.on(Phaser.GameObjects.Events.VIDEO_PLAY, () => this.fitVideo());
    this.video.on(Phaser.GameObjects.Events.VIDEO_TEXTURE, () => this.fitVideo());
    this.video.on(Phaser.GameObjects.Events.VIDEO_COMPLETE, () => this.finish());
    this.video.on(Phaser.GameObjects.Events.VIDEO_ERROR, () => this.finish(false));

    // Pre-play overlay & UI
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020306, 0.72);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, 'HEARTS ACROSS TIME', {
      color: '#f6d57b',
      fontFamily: 'Cinzel, serif',
      fontSize: '34px',
      fontStyle: 'bold',
      stroke: '#180f08',
      strokeThickness: 5,
      shadow: { color: '#d89a42', blur: 14, fill: true },
    }).setOrigin(0.5);

    const subtitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 58, 'SINEMATIK PENGANTAR', {
      color: '#d6c8b4',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '13px',
      letterSpacing: 4,
    }).setOrigin(0.5);

    const playBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 24, 'PUTAR INTRO', {
      backgroundColor: '#1b140fee',
      color: '#fffbf0',
      fontFamily: 'Cinzel, serif',
      fontSize: '18px',
      fontStyle: 'bold',
      padding: { x: 36, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    playBtn.setStroke('#d3a848', 2);

    playBtn.on('pointerover', () => {
      playBtn.setStyle({ backgroundColor: '#d3a848ee', color: '#120f09' });
    });
    playBtn.on('pointerout', () => {
      playBtn.setStyle({ backgroundColor: '#1b140fee', color: '#fffbf0' });
    });
    playBtn.on('pointerup', () => this.startPlayback());

    if (!this.registry.get('reduceMotion')) {
      this.tweens.add({
        targets: playBtn,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 78, 'Tekan ENTER atau Klik untuk Memutar', {
      color: '#9e9282',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '12px',
    }).setOrigin(0.5);

    this.preplayContainer = this.add.container(0, 0, [shade, title, subtitle, playBtn, hint]);

    // Skip button (always available)
    this.skipButton = this.add.text(GAME_WIDTH - 84, GAME_HEIGHT - 36, 'LEWATI', {
      backgroundColor: '#0a0d16cc',
      color: '#ede5d8',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '12px',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.finish());

    this.skipButton.setStroke('#5a4a38', 1);
    this.skipButton.on('pointerover', () => {
      this.skipButton?.setStyle({ backgroundColor: '#d3a848dd', color: '#0f0c08' });
    });
    this.skipButton.on('pointerout', () => {
      this.skipButton?.setStyle({ backgroundColor: '#0a0d16cc', color: '#ede5d8' });
    });

    // Keyboard handlers
    const enter = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const space = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const esc = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    enter?.on('down', () => {
      if (!this.isPlaying) this.startPlayback();
      else this.finish();
    });

    space?.on('down', () => {
      if (!this.isPlaying) this.startPlayback();
      else this.finish();
    });

    esc?.on('down', () => this.finish());
  }

  update(): void {
    if (this.isPlaying) {
      this.fitVideo();
    }
  }

  private fitVideo(): void {
    if (!this.video) return;
    const vw = this.video.width || 1280;
    const vh = this.video.height || 720;
    if (vw > 0 && vh > 0) {
      const scale = Math.max(GAME_WIDTH / vw, GAME_HEIGHT / vh);
      this.video.setScale(scale);
      this.video.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }
  }

  private startPlayback(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.preplayContainer?.setVisible(false);
    this.fitVideo();
    this.video?.play(false);
  }

  private finish(done = true): void {
    this.video?.stop();
    if (done) (this.registry.get('saveSystem') as SaveSystem).markIntroDone();
    this.registry.set('nativeState', 'title');
    this.scene.start('TitleScene');
  }
}
