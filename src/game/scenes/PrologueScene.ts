import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { StoryRunner } from '../narrative/StoryRunner';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

export class PrologueScene extends Phaser.Scene {
  private save!: SaveSystem;
  private runner!: StoryRunner;
  private run!: RunState;

  constructor() {
    super('PrologueScene');
  }

  create(): void {
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.runner = this.registry.get('storyRunner') as StoryRunner;
    this.registry.set('nativeState', 'prologue');
    this.run = this.save.beginCycle();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050407, 1);

    if (this.textures.exists('bgnarator')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bgnarator')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.45);
    }

    this.scene.launch('DialogueScene', {
      nodeId: 'prologue',
      run: this.run,
      onComplete: (action?: { type: string; to?: string }) => {
        if (action?.type === 'vortex' || action?.to === '1944') {
          this.scene.start('VortexScene', { to: '1944', run: this.run });
        } else {
          this.scene.start('Era1944Scene', { run: this.run });
        }
      },
    });
  }
}
