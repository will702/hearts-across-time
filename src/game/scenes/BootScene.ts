import Phaser from 'phaser';
import { SoundManager } from '../audio/SoundManager';
import { loadOptions } from '../options';
import { SaveSystem } from '../systems/SaveSystem';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const save = new SaveSystem(localStorage);
    save.load();
    const options = loadOptions(localStorage);
    const soundManager = new SoundManager(this.game);

    this.registry.set('saveSystem', save);
    this.registry.set('soundManager', soundManager);
    this.registry.set('options', options);
    this.registry.set('reduceMotion', options.reduceMotion === true);
    soundManager.updateVolumes();
    this.registry.set('nativeState', 'preload');
    this.scene.start('PreloadScene');
  }
}
