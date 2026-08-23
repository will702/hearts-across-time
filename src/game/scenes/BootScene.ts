import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { StoryRunner } from '../narrative/StoryRunner';

function legacyOptions(): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('hat_opts') ?? '{}');
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const save = new SaveSystem(localStorage);
    save.load();
    const options = legacyOptions();
    this.registry.set('saveSystem', save);
    this.registry.set('storyRunner', new StoryRunner());
    this.registry.set('options', options);
    this.registry.set('reduceMotion', options.reduceMotion === true);
    this.registry.set('nativeState', 'preload');
    this.scene.start('PreloadScene');
  }
}
