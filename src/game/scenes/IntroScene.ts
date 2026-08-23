import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { SaveSystem } from '../systems/SaveSystem';

export class IntroScene extends Phaser.Scene {
  private video?: Phaser.GameObjects.Video;

  constructor() {
    super('IntroScene');
  }

  create(): void {
    this.registry.set('nativeState', 'intro');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000);
    this.video = this.add.video(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'intro').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    const start = this.button(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'PUTAR INTRO', () => {
      start.setVisible(false);
      this.video?.play(false);
    });
    this.button(GAME_WIDTH - 88, GAME_HEIGHT - 42, 'LEWATI', () => this.finish());
    this.video.on(Phaser.GameObjects.Events.VIDEO_COMPLETE, () => this.finish());
    this.video.on(Phaser.GameObjects.Events.VIDEO_ERROR, () => this.finish(false));

    const enter = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    enter?.once('down', () => start.emit('pointerup'));
  }

  private button(x: number, y: number, label: string, action: () => void): Phaser.GameObjects.Text {
    return this.add.text(x, y, label, {
      backgroundColor: '#120f0dcc', color: '#f5f0e8', fontFamily: 'Poppins, sans-serif',
      fontSize: '15px', padding: { x: 18, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', action);
  }

  private finish(done = true): void {
    this.video?.stop();
    if (done) (this.registry.get('saveSystem') as SaveSystem).markIntroDone();
    this.registry.set('nativeState', 'title');
    this.scene.start('TitleScene');
  }
}
